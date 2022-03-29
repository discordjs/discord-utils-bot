import {
	APIApplicationCommandInteractionDataOption,
	APIApplicationCommandInteractionDataSubcommandOption,
	ApplicationCommandOptionType,
	InteractionResponseType,
} from 'discord-api-types/v10';
import { Doc, DocElement, SourcesStringUnion } from 'discordjs-docs-parser';
import { Response } from 'polka';
import { AUTOCOMPLETE_MAX_ITEMS, DEFAULT_DOCS_BRANCH, prepareErrorResponse } from '../../util';

function autoCompleteMap(elements: DocElement[]) {
	return elements.map((e) => ({ name: e.formattedName, value: e.formattedName }));
}

export function toSourceString(s: string): SourcesStringUnion {
	switch (s) {
		case 'discord-js':
			return 'stable';
		case 'discord-js-dev':
			return 'main';
		case 'collection':
		case 'voice':
		case 'builders':
		case 'rpc':
			return s;
	}

	return DEFAULT_DOCS_BRANCH;
}

interface DocsAutoCompleteData {
	source: SourcesStringUnion;
	query: string;
	target?: string;
}

export function resolveOptionsToDocsAutoComplete(
	options: APIApplicationCommandInteractionDataOption[],
): DocsAutoCompleteData | undefined {
	const [option] = options;
	const source = toSourceString(option.name);

	const root = option as APIApplicationCommandInteractionDataSubcommandOption;
	if (!root.options) {
		return undefined;
	}

	let query = 'Client';
	let target;

	for (const opt of root.options) {
		if (opt.type === ApplicationCommandOptionType.String) {
			if (opt.name === 'query') {
				query = opt.value;
			}
		} else if (opt.type === ApplicationCommandOptionType.User) {
			if (opt.name === 'target') {
				target = opt.value;
			}
		}
	}

	return {
		query,
		target,
		source,
	};
}

export async function djsDocsAutoComplete(
	res: Response,
	options: APIApplicationCommandInteractionDataOption[],
): Promise<Response> {
	const resolved = resolveOptionsToDocsAutoComplete(options);
	if (!resolved) {
		prepareErrorResponse(res, `Payload looks different than expected`);
		return res;
	}

	const { source, query } = resolved;

	const doc = await Doc.fetch(source, { force: true });
	const searchResult = doc.search(query) ?? [];

	res.setHeader('Content-Type', 'application/json');
	res.write(
		JSON.stringify({
			data: {
				choices: autoCompleteMap(searchResult).slice(0, AUTOCOMPLETE_MAX_ITEMS - 1),
			},
			type: InteractionResponseType.ApplicationCommandAutocompleteResult,
		}),
	);

	return res;
}
