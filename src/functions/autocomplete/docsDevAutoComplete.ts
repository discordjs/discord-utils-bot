import process from 'node:process';
import { ApiItemKind } from '@microsoft/api-extractor-model';
import type {
	APIApplicationCommandInteractionDataOption,
	APIApplicationCommandInteractionDataStringOption,
	APIApplicationCommandInteractionDataSubcommandOption,
} from 'discord-api-types/v10';
import { InteractionResponseType } from 'discord-api-types/v10';
import type { Kysely } from 'kysely';
import type { Response } from 'polka';
import { fetch } from 'undici';
import type { Database } from '../../types/djs-db.js';
import { truncate } from '../../util/truncate.js';
import type { DjsDocsSearchResult } from '../djsDocs.js';
import { fetchVersions } from '../djsDocs.js';

const BASE_SEARCH = `https://search.discordjs.dev/`;

function searchURL(pack: string, version: string) {
	return `${BASE_SEARCH}/indexes/${pack}-${version.replaceAll('.', '-')}/search`;
}

function parseDocsPath(path: string) {
	// /0   /1       /2       /3   /4
	// /docs/packages/builders/main/EmbedBuilder:Class
	// /docs/packages/builders/main/EmbedImageData:Interface#proxyURL

	const parts = path.trim().split('/').filter(Boolean);
	const item = parts.at(4);
	const itemParts = item?.split('#');

	const firstItemParts = itemParts?.at(0)?.split(':');
	const itemClass = firstItemParts?.at(0);
	const _package = parts.at(2);
	const version = parts.at(3);
	const method = itemParts?.at(1);

	return {
		package: _package,
		version,
		item,
		class: itemClass,
		method,
	};
}

export async function djsDocsDevAutoComplete(
	db: Kysely<Database>,
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

	const versions = await fetchVersions(db, option.name);
	const latest = versions.at(-2)?.version;

	res.setHeader('Content-Type', 'application/json');

	if (versionOptionData?.focused) {
		const relevantVersions: { name: string; version: string }[] = [];

		versions.reverse();

		for (const version of versions) {
			if (version.version.includes('.')) {
				const [major, minor] = version.version.split('.');
				if (!relevantVersions.some((version) => version.version.startsWith(`${major}.${minor}`))) {
					relevantVersions.push(version);
				}
			} else {
				relevantVersions.push(version);
			}
		}

		res.write(
			JSON.stringify({
				data: {
					choices: relevantVersions.slice(0, 25).map((version) => ({
						name: `${version.name} ${version.version}`,
						value: version.version,
					})),
				},
				type: InteractionResponseType.ApplicationCommandAutocompleteResult,
			}),
		);

		return res;
	}

	if (!queryOptionData) {
		throw new Error('expected query option, none received');
	}

	if (!latest) {
		throw new Error('stable version could not be determined');
	}

	const searchRes = await fetch(searchURL(option.name, versionOptionData?.value ?? latest), {
		method: 'post',
		body: JSON.stringify({
			limit: 25,
			// eslint-disable-next-line id-length
			q: queryOptionData.value,
		}),
		headers: {
			Authorization: `Bearer ${process.env.DJS_DOCS_BEARER!}`,
			'Content-Type': 'application/json',
		},
	});

	const docsResult = (await searchRes.json()) as DjsDocsSearchResult;
	const { hits } = docsResult;

	const choices =
		hits?.map((hit) => {
			const parts = parseDocsPath(hit.path);
			const identifier =
				hit.kind === ApiItemKind.Method || hit.kind === ApiItemKind.Property
					? `${parts.class}#${hit.name}${hit.kind === ApiItemKind.Method ? '()' : ''}`
					: hit.name;

			return {
				name: truncate(`${identifier}${hit.summary ? ` - ${hit.summary}` : ''}`, 100),
				value: hit.path,
			};
		}) ?? [];

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
