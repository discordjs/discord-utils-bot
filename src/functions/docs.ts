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
import { parseDocsPath } from './autocomplete/docsAutoComplete.js';

const BASE_SEARCH = 'https://search.discordjs.dev/';

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

function searchURL(pack: string, version: string) {
	return `${BASE_SEARCH}indexes/${pack}-${version.replaceAll('.', '-')}/search`;
}

function sanitizeText(name: string) {
	return name.replaceAll('*', '');
}

export async function queryDocs(query: string, pack: string, version: string) {
	const searchRes = await fetch(searchURL(pack, version), {
		method: 'post',
		body: JSON.stringify({
			limit: 100,
			// eslint-disable-next-line id-length
			q: query,
		}),
		headers: {
			Authorization: `Bearer ${process.env.DJS_DOCS_BEARER!}`,
			'Content-Type': 'application/json',
		},
	});

	const docsResult = (await searchRes.json()) as any;

	return {
		...docsResult,
		hits: docsResult.hits.map((hit: any) => {
			const parsed = parseDocsPath(hit.path);

			let name = '';
			const isMember = ['Property', 'Method', 'Event', 'PropertySignature', 'EnumMember'].includes(hit.kind);
			if (isMember) {
				name += `${parsed.item}#${hit.name}${hit.kind === 'Method' ? '()' : ''}`;
			} else {
				name += hit.name;
			}

			const parts = [parsed.package, parsed.item.toLocaleLowerCase(), parsed.kind];

			if (isMember) {
				parts.push(hit.name);
			}

			return {
				...hit,
				autoCompleteName: truncate(`${name}${hit.summary ? ` - ${sanitizeText(hit.summary)}` : ''}`, 100, ' '),
				autoCompleteValue: parts.join('|'),
				isMember,
			};
		}),
	};
}

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
				const isFullLink = block.uri.startsWith('http');
				const link = isFullLink ? block.uri : `${DJS_DOCS_BASE}/packages/${_package}/${version}/${block.uri}`;
				return hyperlink(block.members ? `${block.text}${block.members}` : block.text, link);
			}

			return block.text;
		})
		.join('');
}

function formatExample(blocks: any[]) {
	const comments: string[] = [];
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
	const example = formatExample(item.summary?.exampleBlocks);

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

	return lines.join('\n');
}

async function resolveDjsDocsQuery(query: string, source: string, branch: string) {
	if (query.includes('|')) {
		return query;
	} else {
		const searchResult = await queryDocs(query, source, branch);
		const bestHit = searchResult.hits[0];
		if (bestHit) {
			return bestHit.autoCompleteValue;
		}

		return null;
	}
}

export async function djsDocs(res: Response, branch: string, _query: string, source: string, ephemeral = false) {
	try {
		const query = await resolveDjsDocsQuery(_query, source, branch);
		if (!query) {
			prepareErrorResponse(res, 'Cannot find any hits for the provided query - consider using auto complete.');
			return res.end();
		}

		const [_package, itemName, itemKind, member] = query.split('|');
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
