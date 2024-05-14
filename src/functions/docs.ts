import process from 'node:process';
import { bold, codeBlock, hyperlink, inlineCode, strikethrough, underline } from '@discordjs/builders';
import { InteractionResponseType } from 'discord-api-types/v10';
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
 * Vercel blob store format
 *
 * Format: path/pkg/item
 * Item: branch.itemName.itemKind.api.json
 * Example: https://bpwrdvqzqnllsihg.public.blob.vercel-storage.com/rewrite/discord.js/main.actionrow.class.api.json
 */

type CacheEntry = {
	timestamp: number;
	value: any;
};

const docsCache = new Map<string, CacheEntry>();

export async function fetchDocItem(
	_package: string,
	branch: string,
	itemName: string,
	itemKind: string,
): Promise<any | null> {
	try {
		const key = `rewrite/${_package}/${branch}.${itemName}.${itemKind}`;
		const hit = docsCache.get(key);

		if (hit) {
			return hit.value;
		}

		const resourceLink = `${process.env.DJS_BLOB_STORAGE_BASE!}/${key}.api.json`;
		logger.debug(`Requesting documentation from vercel: ${resourceLink}`);
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

function docsLink(item: any, _package: string, version: string, attribute?: string) {
	return `${DJS_DOCS_BASE}/packages/${_package}/${version}/${item.displayName}:${item.kind}${
		attribute ? `#${attribute}` : ''
	}`;
}

function preparePotential(potential: any, member: any, topLevelDisplayName: string): any | null {
	if (potential.displayName?.toLowerCase() === member.toLowerCase()) {
		return {
			...potential,
			displayName: `${topLevelDisplayName}#${potential.displayName}`,
		};
	}

	return null;
}

function effectiveItem(item: any, member?: string) {
	if (!member) {
		return item;
	}

	const iterable = Array.isArray(item.members);
	if (Array.isArray(item.members)) {
		for (const potential of item.members) {
			const hit = preparePotential(potential, member, item.displayName);
			if (hit) {
				return hit;
			}
		}
	} else {
		for (const category of Object.values(item.members)) {
			for (const potential of category as any) {
				const hit = preparePotential(potential, member, item.displayName);
				if (hit) {
					return hit;
				}
			}
		}
	}

	return item;
}

function formatSummary(blocks: any[], _package: string, version: string) {
	return blocks
		.map((block) => {
			if (block.kind === 'LinkTag') {
				return hyperlink(block.text, `${DJS_DOCS_BASE}/packages/${_package}/${version}/${block.uri}`);
			}

			return block.text;
		})
		.join('');
}

function formatItem(_item: any, _package: string, version: string, member?: string) {
	const itemLink = docsLink(_item, _package, version, member);
	const item = effectiveItem(_item, member);
	const sourceUrl = `${item.sourceURL}#L${item.sourceLine}`;

	const [emojiId, emojiName] = itemKindEmoji(item.kind, version === 'main');

	const parts: string[] = [];

	if (item.kind === 'Event') {
		parts.push(bold('(event)'));
	}

	if (item.isStatic) {
		parts.push(bold('(static)'));
	}

	parts.push(underline(bold(hyperlink(item.displayName, itemLink))));

	if (item.extends) {
		// TODO format extends
	}

	const head = `<:${emojiName}:${emojiId}>`;
	const tail = `  ${hyperlink(inlineCode(`@${version}`), sourceUrl, 'source code')}`;
	const middlePart = item.isDeprecated ? strikethrough(parts.join(' ')) : parts.join(' ');

	const lines: string[] = [[head, middlePart, tail].join(' ')];

	const summary = item.summary?.summarySection;
	const deprecationNote = item.summary?.deprecatedBlock;
	const example = item.summary?.exampleBlocks?.[0];

	if (deprecationNote?.length) {
		lines.push(`${bold('[DEPRECATED]')} ${formatSummary(deprecationNote, _package, version)}`);
	} else {
		if (summary?.length) {
			lines.push(formatSummary(summary, _package, version));
		}

		if (example) {
			lines.push(codeBlock(example.language, example.text));
		}
	}

	return lines.join('\n');
}

export async function djsDocs(res: Response, branch: string, query: string, ephemeral = false) {
	const [_package, itemName, itemKind, member] = query.split('|');

	try {
		const item = await fetchDocItem(_package, branch, itemName, itemKind.toLowerCase());
		if (!item) {
			prepareErrorResponse(res, `Could not fetch doc entry for query ${inlineCode(query)}.`);
			return res.end();
		}

		prepareResponse(
			res,
			truncate(formatItem(item, _package, branch, member), MAX_MESSAGE_LENGTH),
			ephemeral,
			[],
			[],
			InteractionResponseType.ChannelMessageWithSource,
		);
		return res.end();
	} catch (_error) {
		const error = _error as Error;
		logger.error(error, error.message);
		prepareErrorResponse(res, 'Something went wrong while executing the command.');
		return res.end();
	}
}
