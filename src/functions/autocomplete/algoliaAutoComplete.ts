import { InteractionResponseType } from 'discord-api-types/v10';
import { Response } from 'polka';
import { fetch } from 'undici';
import { stringify } from 'node:querystring';
import { decode } from 'html-entities';

import { AlgoliaHit, AlgoliaSearchResult } from '../../types/algolia';
import {
	API_BASE_ALGOLIA,
	AUTOCOMPLETE_MAX_ITEMS,
	truncate,
	compactAlgoliaObjectId,
	dedupeAlgoliaHits,
	prepareHeader,
} from '../../util';

function removeDtypesPrefix(str: string | null) {
	return (str ?? '').replace('discord-api-types/', '');
}

export function resolveHitToNamestring(hit: AlgoliaHit) {
	const { hierarchy } = hit;

	const hierarchyOneExtendsZero = (hierarchy.lvl1 ?? '').startsWith(hierarchy.lvl0 ?? '');

	const lvl0 = removeDtypesPrefix(hierarchy.lvl0);
	const lvl1 = removeDtypesPrefix(hierarchy.lvl1);

	let value = hierarchyOneExtendsZero ? lvl1 : `${lvl0}${lvl1 ? `: ${lvl1}` : ''}`;

	if (hierarchy.lvl2) {
		value += ` - ${hierarchy.lvl2}`;
	}
	if (hierarchy.lvl3) {
		value += ` > ${hierarchy.lvl3}`;
	}

	return decode(value)!;
}

function autoCompleteMap(elements: AlgoliaHit[]) {
	const uniqueElements = elements.filter(dedupeAlgoliaHits());
	const mappedElements = uniqueElements.map((element) => ({
		name: truncate(resolveHitToNamestring(element), 90, ''),
		value: compactAlgoliaObjectId(element.objectID),
	}));

	return mappedElements;
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

	prepareHeader(res);
	res.write(
		JSON.stringify({
			data: {
				choices: autoCompleteMap(result.hits?.slice(0, AUTOCOMPLETE_MAX_ITEMS - 1) ?? []),
			},
			type: InteractionResponseType.ApplicationCommandAutocompleteResult,
		}),
	);

	return res;
}
