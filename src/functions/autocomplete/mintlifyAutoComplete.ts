import { createHash } from 'node:crypto';
import { InteractionResponseType } from 'discord-api-types/v10';
import type { Response } from 'polka';
import type { MintlifyResult, MintlifySearchResult } from '../../types/mintlify';
import { AUTOCOMPLETE_MAX_ITEMS, AUTOCOMPLETE_MAX_NAME_LENGTH, MINTLIFY_DISCORD_API } from '../../util/constants.js';
import { prepareHeader } from '../../util/respond.js';
import { truncate } from '../../util/truncate.js';

export const discordDocsResultCache = new Map<string, string>();

export function mintlifyDocsPath(entry: MintlifyResult) {
	return `${entry.page}#${entry.metadata.hash}`;
}

function autocompleteMap(elements: MintlifyResult[]) {
	return elements.map((entry) => {
		const path = mintlifyDocsPath(entry);
		const hash = createHash('md5').update(path).digest('hex');
		discordDocsResultCache.set(hash, path);

		return {
			name: truncate(`${entry.header} // ${entry.metadata.breadcrumbs.join(' > ')}`, AUTOCOMPLETE_MAX_NAME_LENGTH),
			value: hash,
		};
	});
}

export async function mintlifyQuery(query: string, pageSize = AUTOCOMPLETE_MAX_ITEMS) {
	return (await fetch(MINTLIFY_DISCORD_API, {
		method: 'post',
		body: JSON.stringify({
			filters: {},
			query,
			pageSize,
		}),
		headers: {
			'Content-Type': 'application/json',
		},
	}).then(async (res) => res.json())) as MintlifySearchResult;
}

export async function mintlifyAutocomplete(res: Response, query: string) {
	const result = await mintlifyQuery(query);
	const choices = autocompleteMap(result.results);

	prepareHeader(res);
	res.write(
		JSON.stringify({
			type: InteractionResponseType.ApplicationCommandAutocompleteResult,
			data: {
				choices,
			},
		}),
	);

	return res;
}
