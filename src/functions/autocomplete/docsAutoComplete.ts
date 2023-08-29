import type {
	APIApplicationCommandInteractionDataOption,
	APIApplicationCommandInteractionDataSubcommandOption,
} from 'discord-api-types/v10';
import { ApplicationCommandOptionType, InteractionResponseType } from 'discord-api-types/v10';
import type { DocElement } from 'discordjs-docs-parser';
import { Doc, DocTypes, sources } from 'discordjs-docs-parser';
import type { Response } from 'polka';
import type { CustomSourcesString, CustomSourcesStringUnion } from '../../types/discordjs-docs-parser.js';
import { DEFAULT_DOCS_BRANCH, AUTOCOMPLETE_MAX_ITEMS } from '../../util/constants.js';
import { prepareErrorResponse } from '../../util/respond.js';

function autoCompleteMap(elements: DocElement[]) {
	return elements.map((element) => ({ name: element.formattedName, value: element.formattedName }));
}

export function toSourceString(text: string): CustomSourcesStringUnion {
	switch (text) {
		case 'discord-js-v13':
			return 'v13-lts';
		case 'discord-js-v14':
			return 'latest';
		case 'discord-js-dev':
			return 'main';
		case 'collection':
		case 'voice':
		case 'builders':
			return text;
	}

	return DEFAULT_DOCS_BRANCH;
}

type DocsAutoCompleteData = {
	ephemeral?: boolean;
	query: string;
	source: CustomSourcesStringUnion;
	target?: string;
};

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
		} else if (opt.type === ApplicationCommandOptionType.Boolean && opt.name === 'hide') {
			ephemeral = opt.value;
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
