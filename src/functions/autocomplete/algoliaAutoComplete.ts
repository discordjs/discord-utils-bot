import { InteractionResponseType } from 'discord-api-types/v10';
import { Response } from 'polka';
import { fetch } from 'undici';
import { stringify } from 'node:querystring';
import { decode } from 'html-entities';

import { AlgoliaHit, AlgoliaSearchResult } from '../../types/algolia';
import { API_BASE_ALGOLIA, AUTOCOMPLETE_MAX_ITEMS, truncate } from '../../util';

export function resolveHitToNamestring(hit: AlgoliaHit) {
	const { hierarchy } = hit;
	return decode(
		`${hierarchy.lvl0 ?? hierarchy.lvl1 ?? ''}: ${hierarchy.lvl2 ?? hierarchy.lvl1 ?? ''}${
			hierarchy.lvl3 ? ` - ${hierarchy.lvl3}` : ''
		}`,
	);
}

function autoCompleteMap(elements: AlgoliaHit[]) {
	return elements.map((element) => {
		const { objectID } = element;
		return {
			name: truncate(resolveHitToNamestring(element), 95, ''),
			value: objectID,
		};
	});
}

export async function algoliaAutoComplete(
	res: Response,
	query: string,
	algoliaAppId: string,
	algoliaApiKey: string,
	algoliaIndex: string,
): Promise<Response> {
	const full = `http://${algoliaAppId}.${API_BASE_ALGOLIA}/1/indexes/${algoliaIndex}/query`;
	const result = (await fetch(full, {
		method: 'post',
		body: JSON.stringify({
			params: stringify({
				query,
			}),
		}),
		headers: {
			'Content-Type': 'application/json',
			'X-Algolia-API-Key': algoliaApiKey,
			'X-Algolia-Application-Id': algoliaAppId,
		},
	}).then((res) => res.json())) as AlgoliaSearchResult;

	res.setHeader('Content-Type', 'application/json');
	res.write(
		JSON.stringify({
			data: {
				choices: autoCompleteMap(result.hits.slice(0, AUTOCOMPLETE_MAX_ITEMS - 1)),
			},
			type: InteractionResponseType.ApplicationCommandAutocompleteResult,
		}),
	);

	return res;
}
