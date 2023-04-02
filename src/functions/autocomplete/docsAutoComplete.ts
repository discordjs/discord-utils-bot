import {
	APIApplicationCommandInteractionDataOption,
	APIApplicationCommandInteractionDataSubcommandOption,
	ApplicationCommandOptionType,
	InteractionResponseType,
} from 'discord-api-types/v10';
import { Doc, DocElement, DocTypes, sources } from 'discordjs-docs-parser';
import { Response } from 'polka';
import { CustomSourcesString, CustomSourcesStringUnion } from '../../types/discordjs-docs-parser';
import { AUTOCOMPLETE_MAX_ITEMS, DEFAULT_DOCS_BRANCH, prepareErrorResponse } from '../../util';

function autoCompleteMap(elements: DocElement[]) {
	return elements.map((e) => ({ name: e.formattedName, value: e.formattedName }));
}

export function toSourceString(s: string): CustomSourcesStringUnion {
	switch (s) {
		case 'discord-js-v13':
			return 'v13-lts';
		case 'discord-js-v14':
			return 'latest';
		case 'discord-js-dev':
			return 'main';
		case 'collection':
		case 'voice':
		case 'builders':
			return s;
	}

	return DEFAULT_DOCS_BRANCH;
}

interface DocsAutoCompleteData {
	source: CustomSourcesStringUnion;
	query: string;
	target?: string;
	ephemeral?: boolean;
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
	let ephemeral;

	for (const opt of root.options) {
		if (opt.type === ApplicationCommandOptionType.String) {
			if (opt.name === 'query') {
				query = opt.value;
			}
		} else if (opt.type === ApplicationCommandOptionType.User) {
			if (opt.name === 'target') {
				target = opt.value;
			}
		} else if (opt.type === ApplicationCommandOptionType.Boolean) {
			if (opt.name === 'hide') {
				ephemeral = opt.value;
			}
		}
	}

	return {
		query,
		target,
		source,
		ephemeral,
	};
}

export async function djsDocsAutoComplete(
	res: Response,
	options: APIApplicationCommandInteractionDataOption[],
	customSources: Map<CustomSourcesString, string>,
): Promise<Response> {
	const resolved = resolveOptionsToDocsAutoComplete(options);
	if (!resolved) {
		prepareErrorResponse(res, `Payload looks different than expected`);
		return res;
	}

	const { source, query } = resolved;

	// @ts-expect-error: This implements custom sources
	sources.set('v13-lts', customSources.get('v13-lts')!);
	// @ts-expect-error: This implements custom sources
	sources.set('latest', customSources.get('latest')!);

	// @ts-expect-error: This implements custom sources
	const doc = await Doc.fetch(source, { force: true });
	const searchResult = doc.search(query)?.filter((element) => element.docType !== DocTypes.Param) ?? [];

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
