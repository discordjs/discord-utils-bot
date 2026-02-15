import process from 'node:process';
import { stringify } from 'node:querystring';
import { InteractionResponseType } from 'discord-api-types/v10';
import type { Response } from 'polka';
import { fetch } from 'undici';
import { API_BASE_ORAMA, AUTOCOMPLETE_MAX_ITEMS, AUTOCOMPLETE_MAX_NAME_LENGTH } from '../../util/constants.js';
import { prepareHeader } from '../../util/respond.js';
import { truncate } from '../../util/truncate.js';

type OramaDocument = {
	id: string;
	pageSectionTitle: string;
	pageTitle: string;
	path: string;
	siteSection: string;
};

type OramaHit = {
	document: OramaDocument;
	id: string;
	score: number;
};

type OramaResult = {
	count: number;
	elapsed: { formatted: string; raw: number };
	facets: { siteSection: { count: number; values: { docs: number } } };
	hits: OramaHit[];
};

type OramaResultGroup = {
	result: (OramaHit & { index_id: string })[];
	values: string[];
};

type OramaCollectionResult = Omit<OramaResult, 'elapsed'> & {
	groups: OramaResultGroup[];
};

function autoCompleteMap(elements: OramaHit[]) {
	const groups = new Map<string, OramaHit[]>();
	const hits = [];

	for (const element of elements) {
		const section = element.document.siteSection;
		hits.push(element);
		const siblings = groups.get(section) ?? [];

		siblings.push(element);
		siblings.sort((one, other) => other.score - one.score);
		groups.set(section, siblings);
	}

	const picks = [];

	for (const result of hits) {
		picks.push({
			name: truncate(
				`${result.document.pageSectionTitle} - ${result.document.pageTitle}`,
				AUTOCOMPLETE_MAX_NAME_LENGTH,
			),
			value: result.document.path,
		});
	}

	return picks;
}

export async function nodeAutoComplete(res: Response, query: string): Promise<Response> {
	const full = `${API_BASE_ORAMA}/v1/collections/${process.env.ORAMA_COLLECTION}/search?api-key=${process.env.ORAMA_KEY}`;

	const postResponse = await fetch(full, {
		method: 'post',
		body: stringify({
			version: '1.3.2',
			id: process.env.ORAMA_ID,
			// eslint-disable-next-line id-length
			q: JSON.stringify({
				term: query,
				limit: 10,
				threshold: 0,
				facets: { siteSection: {} },
				groupBy: { properties: ['siteSection'] },
			}),
		}),
		headers: {
			'Content-Type': 'application/x-www-form-urlencoded',
		},
	});

	if (postResponse.status !== 200) {
		throw new Error(`Failed retrieving orama data for ${full} query: ${query}`);
	}

	const result = (await postResponse.json()) as OramaCollectionResult;
	prepareHeader(res);

	res.write(
		JSON.stringify({
			data: {
				choices: autoCompleteMap(result.hits ?? []),
			},
			type: InteractionResponseType.ApplicationCommandAutocompleteResult,
		}),
	);

	return res;
}
