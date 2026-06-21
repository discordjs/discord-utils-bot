import { bold, hyperlink, inlineCode } from '@discordjs/builders';
import type { Response } from 'polka';
import {
	DISCORD_DOCS_BASE,
	EMOJI_ID_CLYDE_BLURPLE,
	EXTERNAL_LINK,
	MAX_MESSAGE_LENGTH,
	SUGGESTION_PREFIX_ALLOWANCE,
} from '../util/constants.js';
import { SectionPartType, fetchDocsBody, sectionPartToText } from '../util/discordDocs.js';
import { prepareErrorResponse, prepareResponse } from '../util/respond.js';
import { truncate } from '../util/truncate.js';
import { discordDocsResultCache, mintlifyDocsPath, mintlifyQuery } from './autocomplete/mintlifyAutoComplete.js';

export async function fallbackResult(query: string) {
	const res = await mintlifyQuery(query);

	if (res?.results.length > 0) {
		const first = res.results[0];

		return mintlifyDocsPath(first);
	}

	return null;
}

export async function mintlifyResponse(
	res: Response,
	query: string,
	user?: string,
	ephemeral?: boolean,
): Promise<Response> {
	const hit = discordDocsResultCache.get(query) ?? (await fallbackResult(query));

	if (!hit) {
		prepareErrorResponse(res, 'Make sure to pick something from autocomplete or revise your query!');
		return res;
	}

	const relevantSection = await fetchDocsBody(hit);

	if (!relevantSection) {
		prepareErrorResponse(res, `No documentation found for ${inlineCode(hit)}.`);
		return res;
	}

	const routeElement = relevantSection.parts.find((part) => part.type === SectionPartType.Route);

	const headlineSuffix = routeElement ? sectionPartToText(routeElement) : null;

	const headline = `### <:discorddocs:${EMOJI_ID_CLYDE_BLURPLE}> ${bold(hyperlink(`${relevantSection.headline} ${EXTERNAL_LINK}`, `${DISCORD_DOCS_BASE}/${hit}`))}${headlineSuffix ? `   ${headlineSuffix}` : ''}`;
	const contentParts = [headline];

	let totalLength = headline.length + SUGGESTION_PREFIX_ALLOWANCE;
	for (const part of relevantSection.parts) {
		if (part.type === SectionPartType.Route || part.type === SectionPartType.Preamble) {
			continue;
		}

		const partText = sectionPartToText(part);
		totalLength += partText.length + 1;

		if (totalLength > MAX_MESSAGE_LENGTH) {
			break;
		}

		contentParts.push(partText);
	}

	const result = contentParts.join('\n');
	prepareResponse(res, truncate(result, MAX_MESSAGE_LENGTH), {
		ephemeral,
		suggestion: user ? { userId: user, kind: 'documentation' } : undefined,
	});

	return res;
}
