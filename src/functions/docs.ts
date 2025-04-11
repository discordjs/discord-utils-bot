import process from 'node:process';
import { bold, codeBlock, hyperlink, inlineCode, strikethrough, underline } from '@discordjs/builders';
import type { Response } from 'polka';
import { fetch } from 'undici';
import {
	EMOJI_ID_INTERFACE_DEV,
	EMOJI_ID_INTERFACE,
	EMOJI_ID_FIELD_DEV,
	EMOJI_ID_FIELD,
	EMOJI_ID_CLASS_DEV,
	EMOJI_ID_CLASS,
	EMOJI_ID_METHOD_DEV,
	EMOJI_ID_METHOD,
	EMOJI_ID_EVENT_DEV,
	EMOJI_ID_EVENT,
	EMOJI_ID_DJS_DEV,
	EMOJI_ID_DJS,
	MAX_MESSAGE_LENGTH,
	DJS_DOCS_BASE,
	EMOJI_ID_ENUM_DEV,
	EMOJI_ID_ENUM,
	EMOJI_ID_VARIABLE,
	EMOJI_ID_VARIABLE_DEV,
} from '../util/constants.js';
import { logger } from '../util/logger.js';
import { prepareErrorResponse, prepareResponse } from '../util/respond.js';
import { truncate } from '../util/truncate.js';

/**
 * Bucket format
 *
 * Format: path/pkg/item
 * Item: branch.itemName.itemKind.api.json
 * Key Example: discord.js/main.actionrow.class.api.json
 */

type CacheEntry = {
	timestamp: number;
	value: any;
};

const docsCache = new Map<string, CacheEntry>();

/**
 * Fetch a documentation page for a specific query
 *
 * @param _package - The package name
 * @param version - The package version
 * @param itemName - The item name
 * @param itemKind - The type of the item as per the docs API
 * @returns The documentation item
 */
export async function fetchDocItem(
	_package: string,
	version: string,
	itemName: string,
	itemKind: string,
): Promise<any | null> {
	try {
		const key = `${_package}/${version}.${itemName}.${itemKind}`;
		const hit = docsCache.get(key);

		if (hit) {
			return hit.value;
		}

		const resourceLink = `${process.env.CF_STORAGE_BASE!}/${key}.api.json`;
		logger.debug(`Requesting documentation from CF: ${resourceLink}`);
		const value = await fetch(resourceLink).then(async (result) => result.json());

		docsCache.set(key, {
			timestamp: Date.now(),
			value,
		});

		return value;
	} catch {
		return null;
	}
}

/**
 * Resolve item kind to the respective Discord app emoji
 *
 * @param itemKind - The type of item as per the docs API
 * @param dev - Whether the item is from the dev branch (main)
 * @returns
 */
function itemKindEmoji(itemKind: string, dev = false): [string, string] {
	const lowerItemKind = itemKind.toLowerCase();
	switch (itemKind) {
		case 'Typedef':
		case 'TypeAlias':
		case 'Interface':
		case 'Model':
			return [dev ? EMOJI_ID_INTERFACE_DEV : EMOJI_ID_INTERFACE, lowerItemKind];
		case 'PropertySignature':
		case 'Property':
		case 'IndexSignature':
			return [dev ? EMOJI_ID_FIELD_DEV : EMOJI_ID_FIELD, lowerItemKind];
		case 'Class':
		case 'Constructor':
		case 'ConstructSignature':
			return [dev ? EMOJI_ID_CLASS_DEV : EMOJI_ID_CLASS, lowerItemKind];
		case 'Method':
		case 'MethodSignature':
		case 'Function':
		case 'CallSignature':
			return [dev ? EMOJI_ID_METHOD_DEV : EMOJI_ID_METHOD, lowerItemKind];
		case 'Event':
			return [dev ? EMOJI_ID_EVENT_DEV : EMOJI_ID_EVENT, lowerItemKind];
		case 'Enum':
		case 'EnumMember':
			return [dev ? EMOJI_ID_ENUM_DEV : EMOJI_ID_ENUM, lowerItemKind];
		case 'Variable':
			return [dev ? EMOJI_ID_VARIABLE_DEV : EMOJI_ID_VARIABLE, lowerItemKind];
		default:
			return [dev ? EMOJI_ID_DJS_DEV : EMOJI_ID_DJS, lowerItemKind];
	}
}

/**
 * Build a discord.js documentation link
 *
 * @param item - The item to generate the link for
 * @param _package - The package name
 * @param version - The package version
 * @param attribute - The attribute to link to, if any
 * @returns The formatted link
 */
function docsLink(item: any, _package: string, version: string, attribute?: string) {
	return `${DJS_DOCS_BASE}/packages/${_package}/${version}/${item.displayName}:${item.kind}${
		attribute ? `#${attribute}` : ''
	}`;
}

/**
 * Enriches item members of type "method" with a dynamically generated displayName property
 *
 * @param potential - The item to check and enrich
 * @param member - The member to access
 * @param topLevelDisplayName - The display name of the top level parent
 * @returns The enriched item
 */
function enrichItem(potential: any, member: any, topLevelDisplayName: string): any | null {
	const isMethod = potential.kind === 'Method';
	if (potential.displayName?.toLowerCase() === member.toLowerCase()) {
		return {
			...potential,
			displayName: `${topLevelDisplayName}#${potential.displayName}${isMethod ? '()' : ''}`,
		};
	}

	return null;
}

/**
 * Resolve an items specific member, if required.
 *
 * @param item - The base item to check
 * @param member - The name of the member to access
 * @returns The relevant item
 */
function effectiveItem(item: any, member?: string) {
	if (!member) {
		return item;
	}

	const iterable = Array.isArray(item.members);
	if (Array.isArray(item.members)) {
		for (const potential of item.members) {
			const hit = enrichItem(potential, member, item.displayName);
			if (hit) {
				return hit;
			}
		}
	} else {
		for (const category of Object.values(item.members)) {
			for (const potential of category as any) {
				const hit = enrichItem(potential, member, item.displayName);
				if (hit) {
					return hit;
				}
			}
		}
	}

	return item;
}

/**
 * Format documentation blocks to a summary string
 *
 * @param blocks - The documentation blocks to format
 * @param _package - The package name of the package the blocks belong to
 * @param version - The version of the package the blocks belong to
 * @returns The formatted summary string
 */
function formatSummary(blocks: any[], _package: string, version: string) {
	return blocks
		.map((block) => {
			if (block.kind === 'LinkTag' && block.uri) {
				const isFullLink = block.uri.startsWith('http');
				const link = isFullLink ? block.uri : `${DJS_DOCS_BASE}/packages/${_package}/${version}/${block.uri}`;
				return hyperlink(block.members ? `${block.text}${block.members}` : block.text, link);
			}

			return block.text;
		})
		.join('');
}

/**
 * Format documentation blocks to a code example string
 *
 * @param blocks - The documentation blocks to format
 * @returns The formatted code example string
 */
function formatExample(blocks?: any[]) {
	const comments: string[] = [];

	if (!blocks) {
		return;
	}

	for (const block of blocks) {
		if (block.kind === 'PlainText' && block.text.length) {
			comments.push(`// ${block.text}`);
			continue;
		}

		if (block.kind === 'FencedCode') {
			return codeBlock(block.language, `${comments.join('\n')}\n${block.text}`);
		}
	}
}

/**
 * Format the provided docs source item to a source link, if available
 *
 * @param item - The docs source item to format
 * @param _package - The package to use
 * @param version - The version to use
 * @returns The formatted link, if available, otherwise the provided versionstring
 */
function formatSourceURL(item: any, _package: string, version: string) {
	const sourceUrl = item.sourceURL;
	const versionString = inlineCode(`${_package}@${version}`);

	if (!item.sourceURL?.startsWith('http')) {
		return versionString;
	}

	const link = `${sourceUrl}${item.sourceLine ? `#L${item.sourceLine}` : ''}`;
	return hyperlink(versionString, link, 'source code');
}

/**
 * Format a documentation item to a string
 *
 * @param _item - The docs item to format
 * @param _package - The package name of the packge the item belongs to
 * @param version - The version of the package the item belongs to
 * @param member - The specific item member to access, if any
 * @returns The formatted documentation string for the provided item
 */
function formatItem(_item: any, _package: string, version: string, member?: string) {
	const itemLink = docsLink(_item, _package, version, member);
	const item = effectiveItem(_item, member);

	const [emojiId, emojiName] = itemKindEmoji(item.kind, version === 'main');

	const parts: string[] = [];

	if (item.kind === 'Event') {
		parts.push(bold('(event)'));
	}

	if (item.isStatic) {
		parts.push(bold('(static)'));
	}

	parts.push(underline(bold(hyperlink(item.displayName, itemLink))));

	const head = `<:${emojiName}:${emojiId}>`;
	const tail = formatSourceURL(item, _package, version);
	const middlePart = item.isDeprecated ? strikethrough(parts.join(' ')) : parts.join(' ');

	const lines: string[] = [[head, middlePart, tail].join(' ')];

	const summary = item.summary?.summarySection;
	const defaultValueBlock = item.summary?.defaultValueBlock;
	const deprecationNote = item.summary?.deprecatedBlock;
	const example = formatExample(item.summary?.exampleBlocks);
	const defaultValue = defaultValueBlock ? formatSummary(defaultValueBlock, _package, version) : null;

	if (deprecationNote?.length) {
		lines.push(`${bold('[DEPRECATED]')} ${formatSummary(deprecationNote, _package, version)}`);
	} else {
		if (summary?.length) {
			lines.push(formatSummary(summary, _package, version));
		}

		if (example) {
			lines.push(example);
		}
	}

	if (defaultValue?.length) {
		lines.push(`Default value: ${inlineCode(defaultValue)}`);
	}

	return lines.join('\n');
}

export async function djsDocs(res: Response, version: string, query: string, user?: string, ephemeral?: boolean) {
	try {
		if (!query) {
			prepareErrorResponse(res, 'Cannot find any hits for the provided query - consider using auto complete.');
			return res.end();
		}

		const [_package, itemName, itemKind, member] = query.split('|');
		const item = await fetchDocItem(_package, version, itemName, itemKind.toLowerCase());
		if (!item) {
			prepareErrorResponse(res, `Could not fetch doc entry for query ${inlineCode(query)}.`);
			return res.end();
		}

		prepareResponse(res, truncate(formatItem(item, _package, version, member), MAX_MESSAGE_LENGTH), {
			ephemeral,
			suggestion: user ? { userId: user, kind: 'documentation' } : undefined,
		});
		return res.end();
	} catch (_error) {
		const error = _error as Error;
		logger.error(error, error.message);
		prepareErrorResponse(res, 'Something went wrong while executing the command.');
		return res.end();
	}
}
