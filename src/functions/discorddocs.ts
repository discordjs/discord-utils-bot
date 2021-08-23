const ALGOLIA_APP = process.env.DDOCS_ALGOLIA_APP ?? 'MISSING';
const ALGOLIA_KEY = process.env.DDOCS_ALOGLIA_KEY ?? 'MISSING';

import { formatEmoji, hideLinkEmbed, hyperlink, bold, italic, userMention } from '@discordjs/builders';
import { decode } from 'html-entities';
import fetch from 'node-fetch';
import { Response } from 'polka';
import { stringify } from 'querystring';
import { AlgoliaSearchResult } from '../types/algolia';
import { API_BASE_ALGOLIA, DEFAULT_ALGOLIA_RESULT_AMOUNT, EMOJI_ID_CLYDE_BLURPLE } from '../util/constants';
import { prepareErrorResponse, prepareResponse } from '../util/respond';

export async function discordDeveloperDocs(
	response: Response,
	search: string,
	results = DEFAULT_ALGOLIA_RESULT_AMOUNT,
	target?: string,
): Promise<Response> {
	search = search.trim();
	const full = `http://${ALGOLIA_APP}.${API_BASE_ALGOLIA}/1/indexes/discord/query`;
	const res = (await fetch(full, {
		method: 'post',
		body: JSON.stringify({
			params: stringify({
				query: search,
			}),
		}),
		headers: {
			'Content-Type': 'application/json',
			'X-Algolia-API-Key': ALGOLIA_KEY,
			'X-Algolia-Application-Id': ALGOLIA_APP,
		},
	}).then((res) => res.json())) as AlgoliaSearchResult;

	if (!res.hits.length) {
		prepareErrorResponse(response, 'Nothing found.');
		return response;
	}

	const relevant = res.hits.slice(0, results);
	const result = relevant.map(({ hierarchy, url }) =>
		decode(
			`• ${hierarchy.lvl0 ?? hierarchy.lvl1 ?? ''}: ${hyperlink(
				`${hierarchy.lvl2 ?? hierarchy.lvl1 ?? 'click here'}`,
				hideLinkEmbed(url),
			)}${hierarchy.lvl3 ? ` - ${hierarchy.lvl3}` : ''}`,
		),
	);

	prepareResponse(
		response,
		`${target ? `${italic(`Documentation suggestion for ${userMention(target)}:`)}\n` : ''}${
			formatEmoji(EMOJI_ID_CLYDE_BLURPLE) as string
		} ${bold('Discord Developer docs results:')}\n${result.join('\n')}`,
		false,
		target ? [target] : [],
	);
	return response;
}
