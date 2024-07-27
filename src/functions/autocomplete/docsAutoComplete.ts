import process from 'node:process';
import type {
	APIApplicationCommandInteractionDataOption,
	APIApplicationCommandInteractionDataStringOption,
	APIApplicationCommandInteractionDataSubcommandOption,
} from 'discord-api-types/v10';
import { ApplicationCommandOptionType, InteractionResponseType } from 'discord-api-types/v10';
import type { Response } from 'polka';
import { AUTOCOMPLETE_MAX_ITEMS } from '../../util/constants.js';
import { getDjsVersions } from '../../util/djsdocs.js';
import { logger } from '../../util/logger.js';
import { queryDocs } from '../docs.js';

export function parseDocsPath(path: string) {
	// /0   /1       /2       /3   /4
	// /docs/packages/builders/main/EmbedBuilder:Class
	// /docs/packages/builders/main/EmbedImageData:Interface#proxyURL

	const parts = path.trim().split('/').filter(Boolean);
	const query = parts.at(4);
	const queryParts = query?.split('#');

	const [item, kind] = queryParts?.at(0)?.split(':') ?? [];
	const method = queryParts?.at(1);

	const _package = parts.at(2);
	const version = parts.at(3);

	return {
		package: _package,
		version,
		query,
		item,
		kind,
		method,
	};
}

function convertToDottedName(dashed: string) {
	return dashed.replaceAll('-', '.');
}

export async function djsAutoComplete(
	res: Response,
	options: APIApplicationCommandInteractionDataOption[],
): Promise<Response> {
	const [option] = options;
	const interactionSubcommandData = option as APIApplicationCommandInteractionDataSubcommandOption;
	const queryOptionData = interactionSubcommandData.options?.find((option) => option.name === 'query') as
		| APIApplicationCommandInteractionDataStringOption
		| undefined;
	const versionOptionData = interactionSubcommandData.options?.find((option) => option.name === 'version') as
		| APIApplicationCommandInteractionDataStringOption
		| undefined;

	const versions = getDjsVersions();
	res.setHeader('Content-Type', 'application/json');

	if (!queryOptionData) {
		throw new Error('expected query option, none received');
	}

	const version = versionOptionData?.value ?? versions.versions.get(convertToDottedName(option.name))?.at(1) ?? 'main';
	const docsResult = await queryDocs(queryOptionData.value, option.name, version);
	const choices = [];

	for (const hit of docsResult.hits) {
		if (choices.length >= AUTOCOMPLETE_MAX_ITEMS) {
			break;
		}

		choices.push({
			name: hit.autoCompleteName,
			value: hit.autoCompleteValue,
		});
	}

	res.write(
		JSON.stringify({
			data: {
				choices,
			},
			type: InteractionResponseType.ApplicationCommandAutocompleteResult,
		}),
	);

	return res;
}

type DocsAutoCompleteData = {
	ephemeral?: boolean;
	mention?: string;
	query: string;
	source: string;
	version: string;
};

export function resolveOptionsToDocsAutoComplete(
	options: APIApplicationCommandInteractionDataOption[],
): DocsAutoCompleteData | undefined {
	const allversions = getDjsVersions();
	const [option] = options;
	const source = option.name;

	const root = option as APIApplicationCommandInteractionDataSubcommandOption;
	if (!root.options) {
		return undefined;
	}

	const versions = allversions.versions.get(convertToDottedName(source));

	let query = 'Client';
	let version = versions?.at(1) ?? 'main';
	let ephemeral;
	let mention;

	logger.debug(
		{
			data: {
				query,
				versions,
				version,
				ephemeral,
				mention,
				source,
			},
		},
		`Initial state before parsing options`,
	);

	for (const opt of root.options) {
		if (opt.type === ApplicationCommandOptionType.String) {
			if (opt.name === 'query' && opt.value.length) {
				query = opt.value;
			}

			if (opt.name === 'version' && opt.value.length) {
				version = opt.value;
			}
		} else if (opt.type === ApplicationCommandOptionType.Boolean && opt.name === 'hide') {
			ephemeral = opt.value;
		} else if (opt.type === ApplicationCommandOptionType.User && opt.name === 'mention') {
			mention = opt.value;
		}
	}

	return {
		query,
		source,
		ephemeral,
		version,
		mention,
	};
}
