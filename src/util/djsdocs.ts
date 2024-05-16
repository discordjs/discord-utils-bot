import process from 'node:process';
import { sql } from '@vercel/postgres';
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

export async function fetchDjsVersions(): Promise<DjsVersions> {
	if (process.env.IS_LOCAL_DEV) {
		const devEnvVersions = new Map<string, string[]>();
		devEnvVersions.set('discord.js', ['main']);

		return {
			rows: [{ version: 'main', name: 'discord.js' }],
			versions: devEnvVersions,
			packages: ['discord.js'],
		};
	}

	try {
		const { rows } = await sql<DjsVersionEntry>`select version, name from documentation order by version desc`;

		const packages = new Set<string>();
		const versions = new Map<string, string[]>();

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

export async function prepareDjsVersions() {
	const res = await fetchDjsVersions();
	container.register(kDjsVersions, { useValue: res });
	logger.debug({ res }, 'Registered container after fetching versions');

	return res;
}

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
