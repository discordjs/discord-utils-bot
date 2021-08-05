import { prepareErrorResponse, prepareResponse, prepareSelectMenu } from '../util/respond';
import { Response } from 'polka';
import Collection from '@discordjs/collection';
import { distance } from 'fastest-levenshtein';
import {
	CLOSEST_MATCH_AMOUNT,
	EMOJI_ID_DJS,
	MAX_MESSAGE_LENGTH,
	PREFIX_SUCCESS,
	REMOTE_TAG_URL,
} from '../util/constants';
import { readFileSync } from 'fs';
import { join } from 'path';
import * as TOML from '@ltd/j-toml';
import { logger } from '../util/logger';
import fetch from 'node-fetch';

export interface Tag {
	keywords: string[];
	content: string;
}

export interface TagSimilarityEntry {
	word: string;
	name: string;
	lev: number;
}

function mapper(entry: TagSimilarityEntry) {
	return {
		label: entry.name === entry.word ? entry.name : `${entry.name} (${entry.word})`,
		value: entry.name,
		emoji: {
			id: EMOJI_ID_DJS,
		},
	};
}

export async function loadTags(tagCache: Collection<string, Tag>, remote = false) {
	let file: any;
	if (remote) {
		file = await fetch(REMOTE_TAG_URL).then((r) => r.text());
	} else {
		file = readFileSync(join(__dirname, '..', '..', 'tags', 'tags.toml'), { encoding: 'utf8' });
	}
	const data = TOML.parse(file, 1.0, '\n');
	for (const [key, value] of Object.entries(data)) {
		tagCache.set(key, value as unknown as Tag);
	}
}

export function findSimilar(query: string, tagCache: Collection<string, Tag>, n = 1): Array<TagSimilarityEntry> {
	return tagCache
		.map((tag, key) => {
			const possible: TagSimilarityEntry[] = [];
			tag.keywords.forEach((a) => possible.push({ word: a, lev: distance(query, a.toLowerCase()), name: key }));
			return possible.sort((a, b) => a.lev - b.lev)[0];
		})
		.sort((a, b) => a.lev - b.lev)
		.slice(0, n);
}

export function findTag(
	tagCache: Collection<string, Tag>,
	query: string,
	user?: string,
	target?: string,
): string | null {
	const tag = tagCache.get(query) ?? tagCache.find((v) => v.keywords.includes(query));
	if (!tag) return null;
	const messageParts = [];
	if (user || target) {
		messageParts.push('*Tag suggestion');
	}
	if (target) {
		messageParts.push(` for <@${target}>`);
	}
	if (user) {
		messageParts.push(` selected by <@${user}>`);
	}
	if (user || target) {
		messageParts.push('*\n');
	}
	messageParts.push(tag.content);
	return messageParts.join('');
}

export async function reloadTags(res: Response, tagCache: Collection<string, Tag>, remote = false) {
	const prev = tagCache.size;
	tagCache.clear();
	try {
		await loadTags(tagCache, remote);
		prepareResponse(
			res,
			`${PREFIX_SUCCESS} Tags have fully reloaded ${
				remote ? '(remote)' : '(local)'
			}! Tag cache size has changed from ${prev} to ${tagCache.size}.`,
			true,
		);
	} catch (error) {
		logger.error(error);
		prepareErrorResponse(
			res,
			`Something went wrong while loading tags ${remote ? '(remote)' : '(local)'}\n\`${error.message as string}\``,
		);
	}
	return res;
}

export function showTag(
	res: Response,
	query: string,
	tagCache: Collection<string, Tag>,
	user?: string,
	target?: string,
): Response {
	query = query.trim().toLowerCase();
	const content = findTag(tagCache, query, user, target)!;
	if (content) {
		prepareResponse(res, content, false, target ? [target] : []);
	} else {
		const similar = findSimilar(query, tagCache, CLOSEST_MATCH_AMOUNT);
		if (similar.length) {
			prepareSelectMenu(
				res,
				`Could not find a tag with name or alias \`${query}\`. Maybe you mean one of these?`,
				similar.map(mapper),
				4,
				`tag|${target ?? ''}`,
				true,
			);
		} else {
			prepareErrorResponse(res, `Could not find a tag with name or alias similar to \`${query}\`.`);
		}
	}
	return res;
}

export function searchTag(res: Response, query: string, tagCache: Collection<string, Tag>): Response {
	query = query.toLowerCase();

	const result: string[] = [];
	for (const [key, tag] of tagCache.entries()) {
		if (tag.keywords.find((s) => s.toLowerCase().includes(query)) || tag.content.toLowerCase().includes(query)) {
			if (result.join(', ').length + tag.keywords.length + 6 < MAX_MESSAGE_LENGTH) {
				result.push(`\`${key}\``);
			}
		}
	}

	if (result.length) {
		prepareResponse(res, `Found tags: ${result.join(', ')}`, true);
	} else {
		prepareErrorResponse(res, `No tags matching query \`${query}\` found.`);
	}
	return res;
}
