import { ApiItemKind } from '@microsoft/api-extractor-model';
import { InteractionResponseType } from 'discord-api-types/v10';
import type { Kysely } from 'kysely';
import type { Response } from 'polka';
import type { Database } from '../types/djs-db';
import {
	EMOJI_ID_CLASS_DEV,
	EMOJI_ID_CLASS,
	EMOJI_ID_METHOD_DEV,
	EMOJI_ID_METHOD,
	EMOJI_ID_ENUM_DEV,
	EMOJI_ID_ENUM,
	EMOJI_ID_INTERFACE_DEV,
	EMOJI_ID_INTERFACE,
	EMOJI_ID_VARIABLE_DEV,
	EMOJI_ID_Variable,
	EMOJI_ID_DJS_DEV,
	EMOJI_ID_DJS,
	WEBSITE_URL_ROOT,
	EMOJI_ID_FIELD_DEV,
	EMOJI_ID_FIELD,
} from '../util/constants.js';
import { prepareErrorResponse, prepareResponse } from '../util/respond.js';
import { suggestionString } from '../util/suggestionString.js';
import type { DocsElement } from './djsDocs.js';
import { fetchVersions, generateElementIdentifier, parseDocsPath, fetchDocs } from './djsDocs.js';

function resolveEmoji(kind: ApiItemKind, dev = false) {
	const lowerKind = kind.toLowerCase();
	switch (kind) {
		case ApiItemKind.Class:
			return `<:${lowerKind}:${dev ? EMOJI_ID_CLASS_DEV : EMOJI_ID_CLASS}>`;
		case ApiItemKind.Function:
		case ApiItemKind.Method:
			return `<:${lowerKind}:${dev ? EMOJI_ID_METHOD_DEV : EMOJI_ID_METHOD}>`;
		case ApiItemKind.Enum:
			return `<:${lowerKind}:${dev ? EMOJI_ID_ENUM_DEV : EMOJI_ID_ENUM}>`;
		case ApiItemKind.Interface:
			return `<:${lowerKind}:${dev ? EMOJI_ID_INTERFACE_DEV : EMOJI_ID_INTERFACE}>`;
		case ApiItemKind.Variable:
		case ApiItemKind.TypeAlias:
			return `<:${lowerKind}:${dev ? EMOJI_ID_VARIABLE_DEV : EMOJI_ID_Variable}>`;
		case ApiItemKind.Property:
			return `<:${lowerKind}:${dev ? EMOJI_ID_FIELD_DEV : EMOJI_ID_FIELD}>`;
		default:
			return `<:${lowerKind}:${dev ? EMOJI_ID_DJS_DEV : EMOJI_ID_DJS}>`;
	}
}

function elementLink(item: DocsElement, source: string, version: string, emphasis = false) {
	const identifier = generateElementIdentifier(item);
	const link = `[${identifier}](${WEBSITE_URL_ROOT}${item.path} "${identifier} at ${source}/${version}")`;
	return emphasis ? `**__${link}__**` : link;
}

function formatResult(item: DocsElement, source: string, version: string) {
	const headlineParts = [resolveEmoji(item.kind, version === 'main'), elementLink(item, source, version, true)];

	if (item.extendsFrom?.[0]) {
		headlineParts.push(`(extends ${elementLink(item.extendsFrom[0], source, version)})`);
	}

	if (item.deprecated) {
		headlineParts.push('**[DEPRECATED]**');
	}

	if (item.readonly) {
		headlineParts.push('*{readonly}*');
	}

	headlineParts.push(`*\`${version}\`*`);

	return [headlineParts.join(' '), item.summary].join('\n');
}

export async function djsDocsDev(
	db: Kysely<Database>,
	res: Response,
	query: string,
	target?: string,
	ephemeral?: boolean,
) {
	// '/docs/packages/builders/main/EmbedBuilder:Class'
	const parts = parseDocsPath(query);

	if (!parts.class || !parts.item || !parts.package || !parts.version) {
		prepareErrorResponse(res, 'Unexpected payload format');
		return res;
	}

	const docsItem = await fetchDocs(db, {
		params: {
			package: parts.package,
			version: parts.version,
			item: parts.item,
		},
	});

	if (!docsItem) {
		return;
	}

	const relevantItem = parts.method
		? docsItem.members?.find((member) => member?.name === parts.method) ?? docsItem
		: docsItem;

	prepareResponse(
		res,
		suggestionString('documentation', formatResult(relevantItem, parts.package, parts.version), target),
		ephemeral ?? false,
		target ? [target] : [],
		[],
		InteractionResponseType.ChannelMessageWithSource,
	);

	return res.end();
}
