import { bold, hyperlink, inlineCode, subtext } from '@discordjs/builders';
import type { Response } from 'polka';
import { EMOJI_ID_GUIDE } from '../util/constants.js';
import { findRelevantDocsSection } from '../util/discordDocs.js';
import { noCodeLines, resolveResourceFromGuideUrl } from '../util/djsguide.js';
import { prepareErrorResponse, prepareResponse } from '../util/respond.js';
import { truncate } from '../util/truncate.js';

type GuideCacheEntry = {
	page: string;
	timestamp: number;
};

const cache = new Map<string, GuideCacheEntry>();
const invalid = new Set();

async function getPage(url: string) {
	if (invalid.has(url)) {
		return null;
	}

	const cacheEntry = cache.get(url);

	if (cacheEntry && cacheEntry.timestamp < Date.now() - 1_000 * 60 * 60) {
		return cacheEntry.page;
	}

	const res = await fetch(url);

	if (res.status === 404) {
		invalid.add(url);
		return null;
	}

	const page = await res.text();
	cache.set(url, { page, timestamp: Date.now() });

	return page;
}

export async function oramaResponse(res: Response, resultUrl: string, user?: string, ephemeral?: boolean) {
	const parsed = resolveResourceFromGuideUrl(resultUrl);
	const contentParts: string[] = [];

	const docsContents = await getPage(parsed.githubUrl);

	if (!docsContents) {
		prepareErrorResponse(
			res,
			[
				`Could not find a valid page based on your query ${inlineCode(resultUrl)}`,
				subtext('Make sure to select an autocomplete result to ensure an existing article.'),
			].join('\n'),
		);
		return res;
	}

	const section = findRelevantDocsSection(`#${parsed.anchor ?? parsed.endpoint}`, docsContents);

	if (section) {
		const title = section.headline ?? parsed.endpoint ?? 'No Title';
		contentParts.push(`<:guide:${EMOJI_ID_GUIDE}> ${bold(title)}`);
	}

	const relevantLines = noCodeLines(section?.lines ?? []);
	if (relevantLines.length) {
		const descriptionParts = [];
		let descriptionLength = 0;

		for (const line of relevantLines) {
			if (descriptionLength + line.length < 500) {
				descriptionParts.push(line);
				descriptionLength += line.length;
			}
		}

		contentParts.push(descriptionParts.join(' '));
	}

	contentParts.push(hyperlink('read more', parsed.guideUrl));

	prepareResponse(res, contentParts.join('\n'), {
		ephemeral,
		suggestion: user ? { userId: user, kind: 'guide' } : undefined,
	});
	return res;
}
