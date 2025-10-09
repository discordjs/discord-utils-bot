import type { Response } from 'polka';
import { OramaSearchResult, OramaSearchResults } from '../../types/orama';
import { prepareHeader } from '../../util/respond.js';
import { InteractionResponseType } from 'discord-api-types/v10';
import { AUTOCOMPLETE_MAX_ITEMS, AUTOCOMPLETE_MAX_NAME_LENGTH, DJS_GUIDE_BASE } from '../../util/constants.js';
import { truncate } from '../../util/truncate.js';

function resolveAutocompleteName(element: OramaSearchResult) {
	if (element.type === 'page') {
		return element.content;
	}

	if (element.type === 'heading') {
		return `# ${element.content}`;
	}

	return `[...] ${element.content}`;
}

function autocompleteMap(elements: OramaSearchResults) {
	return elements
		.filter((element) => element.url.length < AUTOCOMPLETE_MAX_NAME_LENGTH)
		.map((element) => {
			return {
				name: truncate(resolveAutocompleteName(element), AUTOCOMPLETE_MAX_NAME_LENGTH),
				value: element.url,
			};
		});
}

export async function oramaAutocomplete(res: Response, query: string) {
	const queryUrl = `${DJS_GUIDE_BASE}/api/search?query=${query}`;
	const result = (await fetch(queryUrl, {
		headers: {
			'Content-Type': 'application/json',
		},
	}).then((res) => res.json())) as OramaSearchResults;

	prepareHeader(res);

	const choices = autocompleteMap(result);

	res.write(
		JSON.stringify({
			data: {
				choices: choices.slice(0, AUTOCOMPLETE_MAX_ITEMS - 1),
			},
			type: InteractionResponseType.ApplicationCommandAutocompleteResult,
		}),
	);

	return res;
}
