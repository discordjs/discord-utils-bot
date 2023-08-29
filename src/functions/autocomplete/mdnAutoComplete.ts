import type { APIApplicationCommandInteractionDataOption } from 'discord-api-types/v10';
import { InteractionResponseType } from 'discord-api-types/v10';
import type { Response } from 'polka';
import type { MdnCommand } from '../../interactions/mdn.js';
import type { MDNIndexEntry } from '../../types/mdn.js';
import { AUTOCOMPLETE_MAX_ITEMS } from '../../util/constants.js';
import { transformInteraction } from '../../util/interactionOptions.js';

type MDNCandidate = {
	entry: MDNIndexEntry;
	matches: string[];
};

function autoCompleteMap(elements: MDNCandidate[]) {
	return elements.map((element) => ({ name: element.entry.title, value: element.entry.url }));
}

export function mdnAutoComplete(
	res: Response,
	options: APIApplicationCommandInteractionDataOption[],
	cache: MDNIndexEntry[],
): Response {
	const { query } = transformInteraction<typeof MdnCommand>(options);

	const parts = query.split(/\.|#/).map((part) => part.toLowerCase());
	const candidates = [];

	for (const entry of cache) {
		const lowerTitle = entry.title.toLowerCase();
		const matches = parts.filter((phrase) => lowerTitle.includes(phrase));
		if (matches.length) {
			candidates.push({
				entry,
				matches,
			});
		}
	}

	const sortedCandidates = candidates.sort((one, other) => {
		if (one.matches.length !== other.matches.length) {
			return other.matches.length - one.matches.length;
		}

		const aMatches = one.matches.join('').length;
		const bMatches = other.matches.join('').length;
		return bMatches - aMatches;
	});

	res.setHeader('Content-Type', 'application/json');
	res.write(
		JSON.stringify({
			data: {
				choices: autoCompleteMap(sortedCandidates).slice(0, AUTOCOMPLETE_MAX_ITEMS - 1),
			},
			type: InteractionResponseType.ApplicationCommandAutocompleteResult,
		}),
	);

	return res;
}
