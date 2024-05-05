import process from 'node:process';
import type {
	APIApplicationCommandInteractionDataOption,
	APIApplicationCommandInteractionDataStringOption,
	APIApplicationCommandInteractionDataSubcommandOption,
} from 'discord-api-types/v10';
import { ApplicationCommandOptionType, InteractionResponseType } from 'discord-api-types/v10';
import type { Response } from 'polka';
import { fetch } from 'undici';
import { AUTOCOMPLETE_MAX_ITEMS } from '../../util/constants.js';
import { getDjsVersions } from '../../util/djsdocs.js';
import { logger } from '../../util/logger.js';
import { truncate } from '../../util/truncate.js';

const BASE_SEARCH = `https://search.discordjs.dev/`;

function searchURL(pack: string, version: string) {
	return `${BASE_SEARCH}indexes/${pack}-${version.replaceAll('.', '-')}/search`;
}

function parseDocsPath(path: string) {
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

	const version = versionOptionData?.value ?? versions.versions.get(option.name)?.at(1) ?? 'main';

	const searchRes = await fetch(searchURL(option.name, version), {
		method: 'post',
		body: JSON.stringify({
			limit: 100,
			// eslint-disable-next-line id-length
			q: queryOptionData.value,
		}),
		headers: {
			Authorization: `Bearer ${process.env.DJS_DOCS_BEARER!}`,
			'Content-Type': 'application/json',
		},
	});

	const docsResult = (await searchRes.json()) as any;
	docsResult.hits.sort((one: any, other: any) => {
		const oneScore = one.kind === 'Class' ? 1 : 0;
		const otherScore = other.kind === 'Class' ? 1 : 0;

		return otherScore - oneScore;
	});

	const choices = [];

	for (const hit of docsResult.hits) {
		if (choices.length >= AUTOCOMPLETE_MAX_ITEMS) {
			break;
		}

		const parsed = parseDocsPath(hit.path);

		let name = '';
		const isMember = ['Property', 'Method', 'Event', 'PropertySignature', 'EnumMember'].includes(hit.kind);
		if (isMember) {
			name += `${parsed.item}#${hit.name}${hit.kind === 'Method' ? '()' : ''}`;
		} else {
			name += hit.name;
		}

		const itemKind = isMember ? 'Class' : hit.kind;
		const parts = [parsed.package, parsed.item.toLocaleLowerCase(), parsed.kind];

		if (isMember) {
			parts.push(hit.name);
		}

		choices.push({
			name: truncate(`${name}${hit.summary ? ` - ${hit.summary}` : ''}`, 100, ' '),
			value: parts.join('|'),
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

	const versions = allversions.versions.get(source.replaceAll('-', '.'));

	let query = 'Client';
	let version = versions?.at(1) ?? 'main';
	let ephemeral;

	logger.debug(
		{
			data: {
				query,
				versions,
				version,
				ephemeral,
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
		}
	}

	return {
		query,
		source,
		ephemeral,
		version,
	};
}
