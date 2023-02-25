import { hideLinkEmbed, hyperlink, userMention, italic, bold } from '@discordjs/builders';
import { fetch } from 'undici';
import { Response } from 'polka';
import { AlgoliaHit } from '../types/algolia';
import { API_BASE_ALGOLIA, prepareErrorResponse, prepareResponse, truncate } from '../util';
import { resolveHitToNamestring } from './autocomplete/algoliaAutoComplete';
import { decode } from 'he';

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
		algoliaObjectId,
	)}`;
	try {
		const hit = (await fetch(full, {
			method: 'get',
			headers: {
				'Content-Type': 'application/json',
				'X-Algolia-API-Key': algoliaApiKey,
				'X-Algolia-Application-Id': algoliaAppId,
			},
		}).then((res) => res.json())) as AlgoliaHit;

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
