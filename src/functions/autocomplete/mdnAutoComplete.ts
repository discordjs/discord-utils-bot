import {
	APIApplicationCommandInteractionDataOption,
	ApplicationCommandOptionType,
	InteractionResponseType,
} from 'discord-api-types/v10';
import { Response } from 'polka';
import { MDNIndexEntry } from '../..';

interface MDNAutoCompleteData {
	query: string;
	target?: string;
}

interface MDNCandidate {
	entry: MDNIndexEntry;
	matches: string[];
}

export function resolveOptionsToMDNAutoComplete(
	options: APIApplicationCommandInteractionDataOption[],
): MDNAutoCompleteData {
	let target;
	let query = '';
	for (const option of options) {
		if (option.type === ApplicationCommandOptionType.String) {
			if (option.name === 'query') {
				query = option.value;
			}
		} else if (option.type === ApplicationCommandOptionType.User) {
			if (option.name === 'target') {
				target = option.value;
			}
		}
	}

	return {
		target,
		query,
	};
}

function autoCompleteMap(elements: MDNCandidate[]) {
	return elements.map((e) => ({ name: e.entry.title, value: e.entry.url }));
}

export function mdnAutoComplete(
	res: Response,
	options: APIApplicationCommandInteractionDataOption[],
	cache: MDNIndexEntry[],
): Response {
	const { query } = resolveOptionsToMDNAutoComplete(options);

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
				choices: autoCompleteMap(sortedCandidates).slice(0, 19),
			},
			type: InteractionResponseType.ApplicationCommandAutocompleteResult,
		}),
	);

	return res;
}
