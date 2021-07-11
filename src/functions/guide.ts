const ALGOLIA_APP = process.env.ALGOLIA_APP ?? 'MISSING';
const ALGOLIA_KEY = process.env.ALGOLIA_KEY ?? 'MISSING';

import * as qs from 'querystring';
import { Response } from 'polka';
import fetch from 'node-fetch';
import { prepareErrorResponse, prepareResponse } from '../util/respond';
import { API_BASE_ALGOLIA, DEFAULT_GUIDE_RESULT_AMOUNT, EMOJI_GUIDE } from '../util/constants';
import { decode } from 'html-entities';

export async function djsGuide(
	response: Response,
	search: string,
	results = DEFAULT_GUIDE_RESULT_AMOUNT,
	target?: string,
): Promise<Response> {
	search = search.trim();
	const query = {
		// eslint-disable-next-line @typescript-eslint/naming-convention
		'X-Algolia-Application-Id': ALGOLIA_APP,
		// eslint-disable-next-line @typescript-eslint/naming-convention
		'X-Algolia-API-Key': ALGOLIA_KEY,
	};
	const full = `http://${ALGOLIA_APP}.${API_BASE_ALGOLIA}/1/indexes/discordjs/query?${qs.stringify(query)}`;
	const res: AlgoliaSearchResult = await fetch(full, {
		method: 'post',
		body: JSON.stringify({
			query: search,
		}),
	}).then((res) => res.json());

	if (!res.hits.length) {
		prepareErrorResponse(response, `Nothing found.`);
		return response;
	}
	const relevant = res.hits.slice(0, results);
	const result = relevant.map(({ hierarchy, url }) =>
		decode(
			`• ${hierarchy.lvl0 ?? hierarchy.lvl1 ?? ''}: [${hierarchy.lvl2 ?? hierarchy.lvl1 ?? 'click here'}](<${url}>)${
				hierarchy.lvl3 ? ` - ${hierarchy.lvl3}` : ''
			}`,
		),
	);

	prepareResponse(
		response,
		`${
			target ? `*Guide suggestion for <@${target}>:*\n` : ''
		}${EMOJI_GUIDE} **discordjs.guide results:**\n${result.join('\n')}`,
		false,
		target ? [target] : [],
	);
	return response;
}

interface AlgoliaSearchResult {
	hits: AlgoliaHit[];
	query: string;
}

interface AlgoliaHit {
	anchor: string;
	content: string | null;
	hierarchy: AlgoliaHitHierarchy;
	url: string;
}

interface AlgoliaHitHierarchy {
	lvl0: string | null;
	lvl1: string | null;
	lvl2: string | null;
	lvl3: string | null;
	lvl4: string | null;
	lvl5: string | null;
	lvl6: string | null;
}
