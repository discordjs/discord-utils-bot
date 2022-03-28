import {
	APIApplicationCommandInteractionDataOption,
	ApplicationCommandOptionType,
	InteractionResponseType,
} from 'discord-api-types/v10';
import { Doc, DocElement, SourcesStringUnion } from 'discordjs-docs-parser';
import { Response } from 'polka';
import { DEFAULT_DOCS_BRANCH } from '../../util/constants';

function autoCompleteMap(elements: DocElement[]) {
	return elements.map((e) => ({ name: e.formattedName, value: e.formattedName }));
}

export async function djsDocsAutoComplete(
	res: Response,
	options: APIApplicationCommandInteractionDataOption[],
): Promise<Response> {
	let query;
	let source;
	for (const option of options) {
		if (option.name === 'query' && option.type === ApplicationCommandOptionType.String) {
		}

		if (option.type === ApplicationCommandOptionType.String) {
			if (option.name === 'query') {
				query = option.value.trim();
			} else if (option.name === 'source') {
				source = option.value as SourcesStringUnion;
			}
		}
	}
	const doc = await Doc.fetch(source ?? DEFAULT_DOCS_BRANCH, { force: true });

	const searchResult = doc.search(query ?? 'Client') ?? [];

	res.setHeader('Content-Type', 'application/json');
	res.write(
		JSON.stringify({
			data: {
				choices: autoCompleteMap(searchResult).slice(0, 19),
			},
			type: InteractionResponseType.ApplicationCommandAutocompleteResult,
		}),
	);

	return res;
}
