import { APIApplicationCommandInteractionDataOption, InteractionResponseType } from 'discord-api-types/v10';
import { Response } from 'polka';
import { MdnCommand } from '../../interactions/mdn';
import { MDNIndexEntry } from '../../types/mdn';
import { AUTOCOMPLETE_MAX_ITEMS, transformInteraction } from '../../util';

interface MDNCandidate {
	entry: MDNIndexEntry;
	matches: string[];
}

function autoCompleteMap(elements: MDNCandidate[]) {
	return elements.map((e) => ({ name: e.entry.title, value: e.entry.url }));
}

export function mdnAutoComplete(
	res: Response,
	options: APIApplicationCommandInteractionDataOption[],
	cache: MDNIndexEntry[],
): Response {
	const { query } = transformInteraction<typeof MdnCommand>(options);

	const parts = query.split(/\.|#/).map((p) => p.toLowerCase());
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

	const sortedCandidates = candidates.sort((a, b) => {
		if (a.matches.length !== b.matches.length) {
			return b.matches.length - a.matches.length;
		}
		const aMatches = a.matches.join('').length;
		const bMatches = b.matches.join('').length;
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
