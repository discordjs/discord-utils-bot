import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Collection } from '@discordjs/collection';
import * as TOML from '@ltd/j-toml';
import type { Response } from 'polka';
import readdirp from 'readdirp';
import { fetch } from 'undici';
import { REMOTE_TAG_URL, PREFIX_SUCCESS } from '../util/constants.js';
import { logger } from '../util/logger.js';
import { prepareResponse, prepareErrorResponse } from '../util/respond.js';

export type Tag = {
	content: string;
	hoisted: boolean;
	keywords: string[];
};

export type TagSimilarityEntry = {
	lev: number;
	name: string;
	word: string;
};

export async function loadTags(tagCache: Collection<string, Tag>, remote = false) {
	const tagFileNames = readdirp(join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'tags'), {
		fileFilter: '*.toml',
	});

	const parts: string[] = [];

	for await (const dir of tagFileNames) {
		const file = remote
			? await fetch(`${REMOTE_TAG_URL}/${dir.basename}`)
					.then(async (response) => response.text())
					.catch((_error) => {
						const error = _error as Error;
						logger.error(error, error.message);
						return `# ${error.message}`;
					})
			: await readFile(dir.fullPath, { encoding: 'utf8' });
		parts.push(file);
	}

	const data = TOML.parse(parts.join('\n\n'), 1, '\n');
	for (const [key, value] of Object.entries(data)) {
		tagCache.set(key, value as unknown as Tag);
	}
}

export function findTag(tagCache: Collection<string, Tag>, query: string): string | null {
	const cleanQuery = query.replaceAll(/\s+/g, '-');
	const tag = tagCache.get(cleanQuery) ?? tagCache.find((tag) => tag.keywords.includes(cleanQuery));
	if (!tag) return null;
	return tag.content;
}

export async function reloadTags(res: Response, tagCache: Collection<string, Tag>, remote = true) {
	const prev = tagCache.size;
	tagCache.clear();
	try {
		await loadTags(tagCache, remote);
		prepareResponse(
			res,
			[
				`${PREFIX_SUCCESS} **Tags have fully reloaded ${remote ? '(remote)' : '(local)'}!**`,
				`Tag cache size has changed from ${prev} to ${tagCache.size}.`,
			].join('\n'),
			{ ephemeral: true },
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

export function showTag(
	res: Response,
	query: string,
	tagCache: Collection<string, Tag>,
	user?: string,
	ephemeral?: boolean,
): Response {
	const trimmedQuery = query.trim().toLowerCase();
	const content = findTag(tagCache, trimmedQuery);

	if (content) {
		prepareResponse(res, content, { ephemeral, suggestion: user ? { userId: user, kind: 'tag' } : undefined });
	} else {
		prepareErrorResponse(res, `Could not find a tag with name or alias similar to \`${trimmedQuery}\`.`);
	}

	return res;
}
