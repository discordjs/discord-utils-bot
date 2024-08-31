import { stringify } from 'node:querystring';
import { InteractionResponseType } from 'discord-api-types/v10';
import { decode } from 'html-entities';
import type { Response } from 'polka';
import { fetch } from 'undici';
import type { AlgoliaHit, AlgoliaSearchResult } from '../../types/algolia.js';
import { compactAlgoliaObjectId } from '../../util/compactAlgoliaId.js';
import { API_BASE_ALGOLIA, AUTOCOMPLETE_MAX_ITEMS } from '../../util/constants.js';
import { dedupeAlgoliaHits } from '../../util/dedupe.js';
import { prepareHeader } from '../../util/respond.js';
import { truncate } from '../../util/truncate.js';

function removeDtypesPrefix(str: string | null) {
	return (str ?? '').replace('discord-api-types/', '');
}

function compressHeading(heading: string) {
	return heading.toLowerCase().replaceAll(/[ ,.=_-]/g, '');
}

function headingIsSimilar(one: string, other: string) {
	const one_ = compressHeading(one);
	const other_ = compressHeading(other);

	return one_.startsWith(other_) || other_.startsWith(one_);
}

export function resolveHitToNamestring(hit: AlgoliaHit) {
	const { hierarchy } = hit;

	const [lvl0, lvl1, lvl2, lvl3] = [hierarchy.lvl0, hierarchy.lvl1, hierarchy.lvl2, hierarchy.lvl3].map((heading) =>
		removeDtypesPrefix(heading),
	);

	let value = headingIsSimilar(lvl0, lvl1) ? lvl1 : `${lvl0}${lvl1 ? `: ${lvl1}` : ''}`;

	if (lvl2.length) {
		value += ` - ${lvl2}`;
	}

	if (lvl3.length) {
		value += ` > ${lvl3}`;
	}

	return decode(value)!;
}

function autoCompleteMap(elements: AlgoliaHit[]) {
	const uniqueElements = elements.filter(dedupeAlgoliaHits());
	return uniqueElements.map((element) => ({
		name: truncate(resolveHitToNamestring(element), 90, ''),
		value: compactAlgoliaObjectId(element.objectID),
	}));
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
	}).then(async (res) => res.json())) as AlgoliaSearchResult;

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
