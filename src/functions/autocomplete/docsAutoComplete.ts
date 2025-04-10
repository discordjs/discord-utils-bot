import process, { versions } from 'node:process';
import type {
	APIApplicationCommandInteractionDataOption,
	APIApplicationCommandInteractionDataStringOption,
} from 'discord-api-types/v10';
import { ApplicationCommandOptionType, InteractionResponseType } from 'discord-api-types/v10';
import type { Response } from 'polka';
import { AUTOCOMPLETE_MAX_ITEMS, AUTOCOMPLETE_MAX_NAME_LENGTH, DJS_QUERY_SEPARATOR } from '../../util/constants.js';
import { getCurrentMainPackageVersion, getDjsVersions } from '../../util/djsdocs.js';
import { truncate } from '../../util/truncate.js';

/**
 * Transform dotted versions into meili search compatible version keys, stripping unwanted characters
 * (^x.y.z -\> x-y-z)
 *
 * @param version - Dotted version string
 * @returns The meili search compatible version
 */
export function meiliVersion(version: string) {
	return version.replaceAll('^', '').split('.').join('-');
}

/**
 * Dissect a discord.js documentation path into its parts
 *
 * @param path - The path to parse
 * @returns The path parts
 */
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

const BASE_SEARCH = 'https://search.discordjs.dev/';

export const djsDocsDependencies = new Map<string, any>();

/**
 * Fetch the discord.js dependencies for a specific verison
 * Note: Tries to resolve from cache before hitting the API
 * Note: Information is resolved from the package.json file in the respective package root
 *
 * @param version - The version to retrieve dependencies for
 * @returns The package dependencies
 */
export async function fetchDjsDependencies(version: string) {
	const hit = djsDocsDependencies.get(version);
	const dependencies =
		hit ??
		(await fetch(`${process.env.DJS_BLOB_STORAGE_BASE}/rewrite/discord.js/${version}.dependencies.api.json`).then(
			async (res) => res.json(),
		));

	if (!hit) {
		djsDocsDependencies.set(version, dependencies);
	}

	return dependencies;
}

/**
 * Fetch the version of a dependency based on a main package version and dependency package name
 *
 * @param mainPackageVersion - The main package version to use for dependencies
 * @param _package - The package to fetch the version for
 * @returns The version of the dependency package
 */
export async function fetchDependencyVersion(mainPackageVersion: string, _package: string) {
	const dependencies = await fetchDjsDependencies(mainPackageVersion);

	const version = Object.entries(dependencies).find(([key, value]) => {
		if (typeof value !== 'string') return false;

		const parts = key.split('/');
		const packageName = parts[1];
		return packageName === _package;
	})?.[1] as string | undefined;

	return version?.replaceAll('^', '');
}

/**
 * Build Meili search queries for the base package and all its dependencies as defined in the documentation
 *
 * @param query - The query term to use across packages
 * @param mainPackageVersion - The version to use across packages
 * @returns Meili query objects for the provided parameters
 */
export async function buildMeiliQueries(query: string, mainPackageVersion: string) {
	const dependencies = await fetchDjsDependencies(mainPackageVersion);
	const baseQuery = {
		// eslint-disable-next-line id-length -- Meili search denotes the query with a "q" key
		q: query,
		limit: 25,
		attributesToSearchOn: ['name'],
		sort: ['type:asc'],
	};

	const queries = [
		{
			indexUid: `discord-js-${meiliVersion(mainPackageVersion)}`,
			...baseQuery,
		},
	];

	for (const [dependencyPackageIdentifier, dependencyVersion] of Object.entries(dependencies)) {
		if (typeof dependencyVersion !== 'string') continue;

		const packageName = dependencyPackageIdentifier.split('/')[1];
		const parts = [...packageName.split('.'), meiliVersion(dependencyVersion)];
		const indexUid = parts.join('-');

		queries.push({
			indexUid,
			...baseQuery,
		});
	}

	queries.push({
		indexUid: 'voice-main',
		...baseQuery,
	});

	return queries;
}

/**
 * Remove unwanted characters from autocomplete text
 *
 * @param text - The input to sanitize
 * @returns The sanitized text
 */
function sanitizeText(text: string) {
	return text.replaceAll('*', '');
}

/**
 * Search the discord.js documentation using meilisearch multi package queries
 *
 * @param query - The query term to use across packages
 * @param version - The main package version to use
 * @returns Documentation results for the provided parameters
 */
export async function djsMeiliSearch(query: string, version: string) {
	const searchResult = await fetch(`${BASE_SEARCH}multi-search`, {
		method: 'post',
		body: JSON.stringify({
			queries: await buildMeiliQueries(query, version),
		}),
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${process.env.DJS_DOCS_BEARER!}`,
		},
	});

	const docsResult = (await searchResult.json()) as any;

	const groupedHits = new Map<string, [string, any][]>();

	for (const result of docsResult.results) {
		const index = result.indexUid;
		for (const hit of result.hits) {
			const current = groupedHits.get(hit.name);
			if (!current) {
				groupedHits.set(hit.name, [[index, hit]]);
				continue;
			}

			current.push([index, hit]);
		}
	}

	const hits = [];

	for (const group of groupedHits.values()) {
		const sorted = group.sort(([fstIndex], [sndIndex]) => {
			if (fstIndex.startsWith('discord-js')) {
				return 1;
			}

			if (sndIndex.startsWith('discord.js')) {
				return -1;
			}

			return 0;
		});

		hits.push(sorted[0][1]);
	}

	return {
		...docsResult,
		hits: hits.map((hit: any) => {
			const parsed = parseDocsPath(hit.path);
			const isMember = ['Property', 'Method', 'Event', 'PropertySignature', 'EnumMember', 'MethodSignature'].includes(
				hit.kind,
			);
			const parts = [parsed.package, parsed.item.toLocaleLowerCase(), parsed.kind];

			if (isMember && parsed.method) {
				parts.push(parsed.method);
			}

			return {
				...hit,
				autoCompleteName: truncate(
					`${hit.name}${hit.summary ? ` - ${sanitizeText(hit.summary)}` : ''}`,
					AUTOCOMPLETE_MAX_NAME_LENGTH,
					' ',
				),
				autoCompleteValue: parts.join(DJS_QUERY_SEPARATOR),
				isMember,
			};
		}),
	};
}

/**
 * Handle the command reponse for the discord.js docs command autocompletion
 *
 * @param res - Reponse to write
 * @param options - Command options
 * @returns The written response
 */
export async function djsAutoComplete(
	res: Response,
	options: APIApplicationCommandInteractionDataOption[],
): Promise<Response> {
	res.setHeader('Content-Type', 'application/json');
	const defaultVersion = getCurrentMainPackageVersion();

	const queryOptionData = options.find((option) => option.name === 'query') as
		| APIApplicationCommandInteractionDataStringOption
		| undefined;
	const versionOptionData = options.find((option) => option.name === 'version') as
		| APIApplicationCommandInteractionDataStringOption
		| undefined;

	if (!queryOptionData) {
		throw new Error('expected query option, none received');
	}

	const docsResult = await djsMeiliSearch(queryOptionData.value, versionOptionData?.value ?? defaultVersion);
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

/**
 * Resolve the required options (with appropriate fallbacks) from the received command options
 *
 * @param options - The options to resolve
 * @returns Resolved options
 */
export async function resolveOptionsToDocsAutoComplete(
	options: APIApplicationCommandInteractionDataOption[],
): Promise<DocsAutoCompleteData | undefined> {
	let query = 'Client';
	let version = getCurrentMainPackageVersion();
	let ephemeral = false;
	let mention;
	let source = 'discord.js';

	for (const opt of options) {
		if (opt.type === ApplicationCommandOptionType.String) {
			if (opt.name === 'query' && opt.value.length) {
				query = opt.value;

				if (query.includes(DJS_QUERY_SEPARATOR)) {
					source = query.split(DJS_QUERY_SEPARATOR)?.[0];
				} else {
					const searchResult = await djsMeiliSearch(query, version);
					const bestHit = searchResult.hits[0];

					if (bestHit) {
						source = bestHit.autoCompleteValue.split(DJS_QUERY_SEPARATOR)[0];
						query = bestHit.autoCompleteValue;
					}
				}
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

	if (source !== 'discord.js') {
		const dependencyVersion = await fetchDependencyVersion(version, source);
		if (dependencyVersion) {
			version = dependencyVersion;
		} else {
			version = 'main';
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
