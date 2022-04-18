import { Response } from 'polka';
import Collection from '@discordjs/collection';
import {
	PREFIX_SUCCESS,
	REMOTE_TAG_URL,
	prepareErrorResponse,
	prepareResponse,
	logger,
	suggestionString,
} from '../util';
import { readFileSync } from 'fs';
import { join } from 'path';
import * as TOML from '@ltd/j-toml';
import { fetch } from 'undici';

export interface Tag {
	keywords: string[];
	content: string;
	hoisted: boolean;
}

export interface TagSimilarityEntry {
	word: string;
	name: string;
	lev: number;
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

export function findTag(tagCache: Collection<string, Tag>, query: string, target?: string): string | null {
	const tag = tagCache.get(query) ?? tagCache.find((v) => v.keywords.includes(query));
	if (!tag) return null;
	return suggestionString('tag', tag.content, target);
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
		logger.error(error as Error);
		prepareErrorResponse(
			res,
			`Something went wrong while loading tags ${remote ? '(remote)' : '(local)'}\n\`${(error as Error).message}\``,
		);
	}
	return res;
}

export function showTag(res: Response, query: string, tagCache: Collection<string, Tag>, target?: string): Response {
	query = query.trim().toLowerCase();
	const content = findTag(tagCache, query, target)!;
	if (content) {
		prepareResponse(res, content, false, target ? [target] : []);
	} else {
		prepareErrorResponse(res, `Could not find a tag with name or alias similar to \`${query}\`.`);
	}
	return res;
}
