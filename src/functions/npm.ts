import type { Response } from 'polka';
import { request } from 'undici';
import { CustomSourcesString } from '../types/discordjs-docs-parser';
import { PartialNpmAPIResponse } from '../types/npm';
import { logger, PREFIX_SUCCESS, prepareErrorResponse, prepareResponse } from '../util';

function formatVersionToRaw(version: string): string {
	return `https://raw.githubusercontent.com/discordjs/docs/main/discord.js/${version}.json`;
}

function getVersionFromRaw(raw: string): string {
	return raw.split('/').pop()!.split('.').slice(0, 3).join('.');
}

export async function loadLatestNpmVersion(
	customSources: Map<CustomSourcesString, string>,
): Promise<PartialNpmAPIResponse> {
	const response = await request('https://registry.npmjs.org/discord.js');
	if (response.statusCode !== 200) {
		throw new Error('Failed to fetch latest npm version');
	}
	const json = (await response.body.json()) as PartialNpmAPIResponse;
	logger.info({
		versions: json['dist-tags'],
		msg: 'Fetched latest npm versions',
	});

	customSources.set('v13-lts', formatVersionToRaw(json['dist-tags']['v13-lts']));
	customSources.set('latest', formatVersionToRaw(json['dist-tags'].latest));

	const responses = await Promise.all(
		Array.from(customSources.values())
			.map((url) => request(url))
			.map((r) => r.catch(() => undefined)),
	);

	const failed = responses.filter((r) => r?.statusCode !== 200);
	if (failed.length) {
		throw new Error(`Failed to fetch ${failed.join(', ')} versions`);
	}

	logger.info({
		msg: 'Loaded latest npm versions for discord.js',
		'v13-lts': customSources.get('v13-lts'),
		latest: customSources.get('latest'),
	});

	return json;
}

export async function reloadNpmVersions(res: Response, customSources: Map<CustomSourcesString, string>) {
	const prev = {
		v13: customSources.get('v13-lts')!,
		latest: customSources.get('latest')!,
	};
	try {
		const result = await loadLatestNpmVersion(customSources);

		const content = [
			`${PREFIX_SUCCESS} **Discord.js npm versions updated!**`,
			'',
			`• v13-lts: \`${getVersionFromRaw(prev.v13)}\` 🠚 \`${result['dist-tags']['v13-lts']}\``,
			`• Latest: \`${getVersionFromRaw(prev.latest)}\` 🠚 \`${result['dist-tags'].latest}\``,
			`• Dev: \`${result['dist-tags'].dev}\``,
		];

		prepareResponse(res, content.join('\n'), true);
	} catch (error) {
		logger.error(error as Error);
		prepareErrorResponse(res, `Something went wrong while updating npm-versions, reverting!`);
		customSources.set('v13-lts', prev.v13);
		customSources.set('latest', prev.latest);
	}
	return res;
}
