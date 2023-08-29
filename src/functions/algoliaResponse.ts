import { hideLinkEmbed, hyperlink, userMention, italic, bold } from '@discordjs/builders';
import pkg from 'he';
import type { Response } from 'polka';
import { fetch } from 'undici';
import type { AlgoliaHit } from '../types/algolia.js';
import { expandAlgoliaObjectId } from '../util/compactAlgoliaId.js';
import { API_BASE_ALGOLIA } from '../util/constants.js';
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
	target?: string,
	ephemeral?: boolean,
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

		prepareResponse(
			res,
			`${target ? `${italic(`Suggestion for ${userMention(target)}:`)}\n` : ''}<:${emojiName}:${emojiId}>  ${bold(
				resolveHitToNamestring(hit),
			)}${hit.content?.length ? `\n${truncate(decode(hit.content), 300)}` : ''}\n${hyperlink(
				'read more',
				hideLinkEmbed(hit.url),
			)}`,
			ephemeral ?? false,
			target ? [target] : [],
		);
	} catch {
		prepareErrorResponse(res, 'Invalid result. Make sure to select an entry from the autocomplete.');
	}

	return res;
}
