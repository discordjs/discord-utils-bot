import { notFound } from '@hapi/boom';
import type {
	ApiEntryPoint,
	ApiPackage,
	ApiClass,
	ApiMethod,
	ApiMethodSignature,
	ApiProperty,
	ApiPropertySignature,
	ApiDeclaredItem,
	ApiItemContainerMixin,
} from '@microsoft/api-extractor-model';
import { ApiModel, ApiFunction, ApiItem, ApiItemKind, ExcerptTokenKind } from '@microsoft/api-extractor-model';
import {
	DocNodeKind,
	type DocCodeSpan,
	type DocNode,
	type DocParagraph,
	type DocPlainText,
	TSDocConfiguration,
} from '@microsoft/tsdoc';
import { TSDocConfigFile } from '@microsoft/tsdoc-config';
import type { Kysely } from 'kysely';
import { request } from 'undici';
import type { Database } from '../types/djs-db';

const OVERLOAD_SEPARATOR = ':';

type MemberJSON = {
	kind: string;
	name: string;
	path: string;
	summary: string | null;
};

export const PACKAGES = [
	'brokers',
	'builders',
	'collection',
	'core',
	'formatters',
	'next',
	'proxy',
	'rest',
	'util',
	'voice',
	'ws',
];

function memberPredicate(item: ApiItem): item is ApiMethod | ApiMethodSignature | ApiProperty | ApiPropertySignature {
	return (
		item.kind === ApiItemKind.Property ||
		item.kind === ApiItemKind.PropertySignature ||
		item.kind === ApiItemKind.Method ||
		item.kind === ApiItemKind.MethodSignature
	);
}

const idx = 0;

/**
 * Resolves all inherited members (including merged members) of a given parent.
 *
 * @param parent - The parent to resolve the inherited members of.
 * @param predicate - A predicate to filter the members by.
 */
function resolveMembers<T extends ApiItem>(parent: ApiItemContainerMixin, predicate: (item: ApiItem) => item is T) {
	const seenItems = new Set<string>();
	const inheritedMembers = parent.findMembersWithInheritance().items.reduce((acc, item) => {
		if (predicate(item)) {
			acc.push({
				item,
				inherited:
					item.parent?.containerKey === parent.containerKey
						? undefined
						: (item.parent as ApiItemContainerMixin | undefined),
			});
			seenItems.add(item.containerKey);
		}

		return acc;
	}, new Array<{ inherited?: ApiItemContainerMixin | undefined; item: T }>());

	const mergedMembers = parent
		.getMergedSiblings()
		.filter((sibling) => sibling.containerKey !== parent.containerKey)
		.flatMap((sibling) => (sibling as ApiItemContainerMixin).findMembersWithInheritance().items)
		.filter((item) => predicate(item) && !seenItems.has(item.containerKey))
		.map((item) => ({ item: item as T, inherited: item.parent ? (item.parent as ApiItemContainerMixin) : undefined }));

	return [...inheritedMembers, ...mergedMembers];
}

export type DjsDocsSearchResultEntry = DocsElement & {
	id: number;
};

export type DjsDocsSearchResult = {
	hits?: DjsDocsSearchResultEntry[];
};

export type DocsElement = {
	deprecated?: boolean;
	extendsFrom?: (DocsElement | null)[] | null;
	inheritedFrom?: DocsElement | null;
	kind: ApiItemKind;
	members?: (DocsElement | null)[] | null;
	name: string;
	optional?: boolean;
	parentName?: string;
	path: string;
	protected?: boolean;
	readonly?: boolean;
	summary: string;
};

export async function fetchDocs(
	db: Kysely<Database>,
	{ params }: { params: { item: string; package: string; version: string } },
): Promise<DocsElement | null> {
	const member = await fetchMember(db, {
		package: params.package,
		version: params.version,
		item: params.item,
	});

	if (!member) {
		return null;
	}

	const model = member.getAssociatedModel();
	const excerpt = (member as ApiClass).extendsType?.excerpt;

	return {
		name: member.displayName,
		kind: member.kind,
		extendsFrom:
			excerpt?.spannedTokens
				.map((token) => {
					if (token.kind === ExcerptTokenKind.Reference) {
						const referenceItem = member
							.getAssociatedModel()
							?.resolveDeclarationReference(token.canonicalReference!, model).resolvedApiItem;

						if (referenceItem) {
							return {
								name: referenceItem.displayName,
								kind: referenceItem.kind,
								summary: tryResolveSummaryText(referenceItem as unknown as ApiDeclaredItem) ?? '',
								path: generatePath(referenceItem.getHierarchy(), params.version),
							};
						}
					}

					return null;
				})
				.filter(Boolean) ?? null,
		summary: tryResolveSummaryText(member as ApiDeclaredItem) ?? '',
		path: generatePath(member.getHierarchy(), params.version),
		members:
			member.kind === ApiItemKind.Class || member.kind === ApiItemKind.Interface
				? resolveMembers(member as ApiItemContainerMixin, memberPredicate).map((innerMember) => {
						const isDeprecated = Boolean(innerMember.item.tsdocComment?.deprecatedBlock);

						return {
							inheritedFrom: innerMember.inherited
								? {
										name: innerMember.inherited.displayName,
										kind: innerMember.inherited.kind,
										summary: tryResolveSummaryText(innerMember.inherited as unknown as ApiDeclaredItem) ?? '',
										path: generatePath(innerMember.inherited.getHierarchy(), params.version),
								  }
								: null,
							name: innerMember.item.displayName,
							kind: innerMember.item.kind,
							deprecated: isDeprecated,
							// @ts-expect-error: Typings
							readonly: innerMember.item.isReadonly ?? false,
							optional: innerMember.item.isOptional,
							// @ts-expect-error: Typings
							static: innerMember.item.isStatic ?? false,
							// @ts-expect-error: Typings
							protected: innerMember.item.isProtected ?? false,
							summary: tryResolveSummaryText(innerMember.item as ApiDeclaredItem) ?? '',
							path: generatePath(innerMember.item.getHierarchy(), params.version),
							parentName: member.displayName,
						};
				  })
				: null,
	};
}

export function generateElementIdentifier(element: DocsElement) {
	if (element.parentName?.length) {
		return `${element.parentName}#${element.name}${element.kind === ApiItemKind.Method ? '()' : ''}`;
	}

	return element.name;
}

export function parseDocsPath(path: string) {
	// /0   /1       /2       /3   /4
	// /docs/packages/builders/main/EmbedBuilder:Class
	// /docs/packages/builders/main/EmbedImageData:Interface#proxyURL

	const parts = path.trim().split('/').filter(Boolean);
	const item = parts.at(4);
	const itemParts = item?.split('#');

	const firstItemParts = itemParts?.at(0)?.split(':');
	const itemClass = firstItemParts?.at(0);
	const itemKind = firstItemParts?.at(1);

	const _package = parts.at(2);
	const version = parts.at(3);
	const method = itemParts?.at(1);

	const identifier = method ? `${itemClass}#${method}${itemKind === ApiItemKind.Method ? '()' : ''}` : `${itemClass}`;

	return {
		package: _package,
		version,
		item,
		class: itemClass,
		method,
		identifier,
	};
}

function generatePath(items: readonly ApiItem[], version: string) {
	let path = '/docs/packages';

	for (const item of items) {
		switch (item.kind) {
			case ApiItemKind.Model:
			case ApiItemKind.EntryPoint:
			case ApiItemKind.EnumMember:
				break;
			case ApiItemKind.Package:
				path += `/${item.displayName}`;
				break;
			case ApiItemKind.Function:
				// eslint-disable-next-line no-case-declarations
				const functionItem = item as ApiFunction;
				path += `/${functionItem.displayName}${
					functionItem.overloadIndex && functionItem.overloadIndex > 1 ? `:${functionItem.overloadIndex}` : ''
				}:${item.kind}`;
				break;
			case ApiItemKind.Property:
			case ApiItemKind.Method:
			case ApiItemKind.MethodSignature:
			case ApiItemKind.PropertySignature:
				path += `#${item.displayName}`;
				break;
			default:
				path += `/${item.displayName}:${item.kind}`;
		}
	}

	// eslint-disable-next-line prefer-named-capture-group, unicorn/no-unsafe-regex
	return path.replace(/@discordjs\/(.*)\/(.*)?/, `$1/${version}/$2`);
}

function addPackageToModel(model: ApiModel, data: any) {
	const tsdocConfiguration = new TSDocConfiguration();
	const tsdocConfigFile = TSDocConfigFile.loadFromObject(data.metadata.tsdocConfig);
	tsdocConfigFile.configureParser(tsdocConfiguration);

	const apiPackage = ApiItem.deserialize(data, {
		apiJsonFilename: '',
		toolPackage: data.metadata.toolPackage,
		toolVersion: data.metadata.toolVersion,
		versionToDeserialize: data.metadata.schemaVersion,
		tsdocConfiguration,
	}) as ApiPackage;
	model.addMember(apiPackage);
	return model;
}

/**
 * Attempts to resolve the summary text for the given item.
 *
 * @param item - The API item to resolve the summary text for.
 */
function tryResolveSummaryText(item: ApiDeclaredItem): string | null {
	if (!item?.tsdocComment) {
		return null;
	}

	const { summarySection } = item.tsdocComment;

	let retVal = '';

	// Recursively visit the nodes in the summary section.
	const visitTSDocNode = (node: DocNode) => {
		switch (node.kind) {
			case DocNodeKind.CodeSpan:
				retVal += (node as DocCodeSpan).code;
				break;
			case DocNodeKind.PlainText:
				retVal += (node as DocPlainText).text;
				break;
			case DocNodeKind.Section:
			case DocNodeKind.Paragraph: {
				for (const child of (node as DocParagraph).nodes) {
					visitTSDocNode(child);
				}

				break;
			}

			default: // We'll ignore all other nodes.
				break;
		}
	};

	for (const node of summarySection.nodes) {
		visitTSDocNode(node);
	}

	if (retVal === '') {
		return null;
	}

	return retVal;
}

type ItemRouteParams = {
	item: string;
	package: string;
	version: string;
};

function findMemberByKey(model: ApiModel, packageName: string, containerKey: string) {
	const pkg = model.tryGetPackageByName(`@discordjs/${packageName}`)!;
	return (pkg.members[0] as ApiEntryPoint).tryGetMemberByKey(containerKey);
}

function findMember(model: ApiModel, packageName: string, memberName: string | undefined): ApiItem | undefined {
	if (!memberName) {
		return undefined;
	}

	const pkg = model.tryGetPackageByName(`@discordjs/${packageName}`)!;
	return pkg.entryPoints[0]?.findMembersByName(memberName)[0];
}

async function fetchModelJSON(db: Kysely<Database>, packageName: string, version: string): Promise<unknown> {
	const result = await db
		.selectFrom('documentation')
		.selectAll()
		.where('name', '=', packageName)
		.where('version', '=', version)
		.executeTakeFirst();
	return result?.data;
}

export async function fetchVersions(db: Kysely<Database>, name: string) {
	return db.selectFrom('documentation').select(['name', 'version']).where('name', '=', name).execute();
}

async function fetchMember(
	db: Kysely<Database>,
	{ package: packageName, version: branchName = 'main', item }: ItemRouteParams,
) {
	if (!PACKAGES.includes(packageName)) {
		notFound();
	}

	const model = new ApiModel();

	if (branchName === 'main') {
		const modelJSONFiles = await Promise.all(PACKAGES.map(async (pkg) => fetchModelJSON(db, pkg, branchName)));

		for (const modelJSONFile of modelJSONFiles) {
			addPackageToModel(model, modelJSONFile);
		}
	} else {
		const modelJSON = await fetchModelJSON(db, packageName, branchName);
		addPackageToModel(model, modelJSON);
	}

	const [memberName, overloadIndex] = decodeURIComponent(item).split(OVERLOAD_SEPARATOR);

	// eslint-disable-next-line prefer-const
	let { containerKey, displayName: name } = findMember(model, packageName, memberName) ?? {};
	if (name && overloadIndex && !Number.isNaN(Number.parseInt(overloadIndex, 10))) {
		containerKey = ApiFunction.getContainerKey(name, Number.parseInt(overloadIndex, 10));
	}

	return memberName && containerKey ? findMemberByKey(model, packageName, containerKey) ?? null : null;
}
