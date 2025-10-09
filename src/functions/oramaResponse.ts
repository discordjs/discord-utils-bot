import type { Response } from 'polka';
import { prepareResponse } from '../util/respond.js';
import { noCodeLines, resolveResourceFromGuideUrl } from '../util/djsguide.js';
import { findRelevantDocsSection } from '../util/discordDocs.js';
import { truncate } from '../util/truncate.js';
import { bold, hyperlink } from '@discordjs/builders';
import { EMOJI_ID_GUIDE } from '../util/constants.js';

type GuideCacheEntry = {
	page: string;
	timestamp: number;
};

const cache = new Map<string, GuideCacheEntry>();

async function getPage(url: string) {
	const cacheEntry = cache.get(url);

	if (cacheEntry) {
		if (cacheEntry.timestamp < Date.now() - 1_000 * 60 * 60) {
			console.log(`Cache hit: ${url}`);
			return cacheEntry.page;
		}
	}

	const page = await fetch(url).then((res) => res.text());
	cache.set(url, { page, timestamp: Date.now() });

	return page;
}

export async function oramaResponse(res: Response, resultUrl: string, user?: string, ephemeral?: boolean) {
	const parsed = resolveResourceFromGuideUrl(resultUrl);
	const contentParts: string[] = [];

	const docsContents = await getPage(parsed.githubUrl);
	const section = findRelevantDocsSection(parsed.anchor ? `#${parsed.anchor}` : parsed.endpoint ?? '', docsContents);

	if (section) {
		const title = section.heading?.label ?? parsed.endpoint ?? 'No Title';
		contentParts.push(`<:guide:${EMOJI_ID_GUIDE}> ${bold(title)}`);
	}

	const relevantLines = noCodeLines(section?.lines ?? []);
	if (relevantLines.length) {
		contentParts.push(truncate(relevantLines.join(' '), 300));
	}

	contentParts.push(hyperlink('read more', parsed.guideUrl));

	prepareResponse(res, contentParts.join('\n'), {
		ephemeral,
		suggestion: user ? { userId: user, kind: 'guide' } : undefined,
	});
	return res;
}
