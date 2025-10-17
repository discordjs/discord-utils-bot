import { hideLinkEmbed, hyperlink, userMention, italic, bold, inlineCode } from '@discordjs/builders';
import pkg from 'he';
import type { Response } from 'polka';
import { fetch } from 'undici';
import type { AlgoliaHit } from '../types/algolia.js';
import { expandAlgoliaObjectId } from '../util/compactAlgoliaId.js';
import { API_BASE_ALGOLIA } from '../util/constants.js';
import { fetchDocsBody } from '../util/discordDocs.js';
import { noCodeLines } from '../util/djsguide.js';
import { prepareResponse, prepareErrorResponse } from '../util/respond.js';
import { truncate } from '../util/truncate.js';
import { resolveHitToNamestring } from './autocomplete/algoliaAutoComplete.js';

const { decode } = pkg;

export async function algoliaResponse(
	res: Response,
	algoliaAppId: string,
	algoliaApiKey: string,
	algoliaIndex: string,
	algoliaObjectId: string,
	emojiId: string,
	emojiName: string,
	user?: string,
	ephemeral?: boolean,
	type = 'documentation',
): Promise<Response> {
	const full = `http://${algoliaAppId}.${API_BASE_ALGOLIA}/1/indexes/${algoliaIndex}/${encodeURIComponent(
		expandAlgoliaObjectId(algoliaObjectId),
	)}`;
	try {
		const hit = (await fetch(full, {
			method: 'get',
			headers: {
				'Content-Type': 'application/json',
				'X-Algolia-API-Key': algoliaApiKey,
				'X-Algolia-Application-Id': algoliaAppId,
			},
		}).then(async (res) => res.json())) as AlgoliaHit;

		const docsSection = hit.url.includes('discord.com') ? await fetchDocsBody(hit.url) : null;

		const headlineSuffix = docsSection?.route
			? inlineCode(`${docsSection.route.verb} ${docsSection.route.path}`.replaceAll('\\', ''))
			: null;

		const contentParts = [
			`<:${emojiName}:${emojiId}>  ${bold(resolveHitToNamestring(hit))}${headlineSuffix ? ` ${headlineSuffix}` : ''}`,
		];

		if (hit.content?.length) {
			contentParts.push(`${truncate(decode(hit.content), 300)}`);
		} else {
			const descriptionParts = [];
			let descriptionLength = 0;
			const relevantLines = noCodeLines(docsSection?.lines ?? []);

			if (relevantLines.length) {
				for (const line of relevantLines) {
					if (descriptionLength + line.length < 500) {
						descriptionParts.push(line);
						descriptionLength += line.length;
					}
				}

				contentParts.push(descriptionParts.join(' '));
			}
		}

		contentParts.push(`${hyperlink('read more', hideLinkEmbed(hit.url))}`);

		prepareResponse(res, contentParts.join('\n'), {
			ephemeral,
			suggestion: user ? { userId: user, kind: type } : undefined,
		});
	} catch {
		prepareErrorResponse(res, 'Invalid result. Make sure to select an entry from the autocomplete.');
	}

	return res;
}
