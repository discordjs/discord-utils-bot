import process from 'node:process';
import Cloudflare from 'cloudflare';
import { container } from 'tsyringe';
import { logger } from './logger.js';

export const kDjsVersions = Symbol('DJS_VERSIONS');

export type DjsVersionEntry = {
	name: string;
	version: string;
};
export type DjsVersions = {
	packages: string[];
	rows: DjsVersionEntry[];
	versions: Map<string, string[]>;
};

/**
 * Fetch, categorize, and cache package versions from the database
 * Note: returns fallback data if running on local development
 *
 * @returns The fetched and categorized data
 */
export async function fetchDjsVersions(): Promise<DjsVersions> {
	if (process.env.IS_LOCAL_DEV) {
		logger.debug('NOTE: Only main is returned in a local development environment');
		const devEnvVersions = new Map<string, string[]>();
		devEnvVersions.set('discord.js', ['main']);

		return {
			rows: [{ version: 'main', name: 'discord.js' }],
			versions: devEnvVersions,
			packages: ['discord.js'],
		};
	}

	try {
		const client = new Cloudflare({
			apiToken: process.env.CF_D1_DOCS_API_KEY,
		});

		const page = await client.d1.database.query(process.env.CF_D1_DOCS_ID!, {
			account_id: process.env.CF_ACCOUNT_ID!,
			sql: `select version, name from documentation order by version desc;`,
		});

		const packages = new Set<string>();
		const versions = new Map<string, string[]>();
		const res = page.result[0];

		if (!res?.results) {
			logger.error('No results for version lookup');

			return {
				rows: [],
				versions: new Map<string, string[]>(),
				packages: [],
			};
		}

		const rows = res.results as DjsVersionEntry[];
		for (const row of rows) {
			packages.add(row.name);
			const currentVersions = versions.get(row.name);
			if (currentVersions) {
				currentVersions.push(row.version);
				continue;
			}

			versions.set(row.name, [row.version]);
		}

		return {
			rows,
			packages: [...packages],
			versions,
		};
	} catch (error_) {
		const error = error_ as Error;
		logger.error(error, error.message);

		return {
			rows: [],
			versions: new Map<string, string[]>(),
			packages: [],
		};
	}
}

/**
 * Re-populate the local cache with data fetched from the database
 *
 * @returns The fetched and categorized data
 */

export async function reloadDjsVersions() {
	const res = await fetchDjsVersions();
	container.register<DjsVersions>(kDjsVersions, { useValue: res });
	logger.debug({ res }, 'Registered container after fetching versions');

	return res;
}

/**
 * Resolve package version data from the container (no DB query)
 *
 * @returns The cached data
 */
export function getDjsVersions() {
	const versions = container.resolve<DjsVersions>(kDjsVersions);
	logger.debug({ versions }, 'Retrieving versions from container');
	if (!versions?.versions) {
		return {
			rows: [],
			versions: new Map<string, string[]>(),
			packages: [],
		} satisfies DjsVersions;
	}

	return versions;
}

/**
 * Resolve the latest version of the main page from the container (no DB query)
 *
 * @returns The current main package version
 */
export function getCurrentMainPackageVersion() {
	const versions = container.resolve<DjsVersions>(kDjsVersions);
	logger.debug({ versions }, 'Retrieving versions from container to fetch current main repo version');
	if (!versions?.versions) {
		return 'main';
	}

	return versions.versions.get('discord.js')?.[1] ?? 'main';
}
