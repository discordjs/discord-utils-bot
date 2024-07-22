import process from 'node:process';
import { stringify } from 'node:querystring';
import { InteractionResponseType } from 'discord-api-types/v10';
import type { Response } from 'polka';
import { fetch } from 'undici';
import { API_BASE_ORAMA, AUTOCOMPLETE_MAX_ITEMS } from '../../util/constants.js';
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

function autoCompleteMap(elements: OramaDocument[]) {
	return elements.map((element) => {
		const cleanSectionTitle = element.pageSectionTitle.replaceAll('`', '');
		const name = truncate(`${element.pageTitle} > ${cleanSectionTitle}`, 90, '');
		if (element.path.length > 100) {
			return {
				name: truncate(`[path too long] ${element.pageTitle} > ${cleanSectionTitle}`, 100, ''),
				value: element.pageTitle,
			};
		}

		return {
			name,
			// we cannot use the full url with the node api base appended here, since discord only allows string values of length 100
			// some of `crypto` results are longer, if prefixed
			value: element.path,
		};
	});
}

export async function nodeAutoComplete(res: Response, query: string): Promise<Response> {
	const full = `${API_BASE_ORAMA}/indexes/${process.env.ORAMA_CONTAINER}/search?api-key=${process.env.ORAMA_KEY}`;

	const result = (await fetch(full, {
		method: 'post',
		body: stringify({
			version: '1.3.2',
			id: process.env.ORAMA_ID,
			// eslint-disable-next-line id-length
			q: JSON.stringify({
				term: query,
				mode: 'fulltext',
				limit: 25,
				threshold: 0,
				boost: { pageSectionTitle: 4, pageSectionContent: 2.5, pageTitle: 1.5 },
				facets: { siteSection: {} },
				returning: ['path', 'pageSectionTitle', 'pageTitle', 'path', 'siteSection'],
			}),
		}),
		headers: {
			'Content-Type': 'application/x-www-form-urlencoded',
		},
	}).then(async (res) => res.json())) as OramaResult;

	prepareHeader(res);
	res.write(
		JSON.stringify({
			data: {
				choices: autoCompleteMap(result.hits?.slice(0, AUTOCOMPLETE_MAX_ITEMS - 1).map((hit) => hit.document) ?? []),
			},
			type: InteractionResponseType.ApplicationCommandAutocompleteResult,
		}),
	);

	return res;
}
