import { URLSearchParams } from 'node:url';
import { InteractionResponseType } from 'discord-api-types/v10';
import type { Response } from 'polka';
import type { ZendeskSearchResponse, ZendeskSearchResult } from '../../types/zendesk';
import {
	AUTOCOMPLETE_MAX_ITEMS,
	AUTOCOMPLETE_MAX_NAME_LENGTH,
	DISCORD_HELPDESK_BASE,
	DISCORD_HELPDESK_DEV_BASE,
	DJS_QUERY_SEPARATOR,
} from '../../util/constants.js';
import { prepareHeader } from '../../util/respond.js';
import { truncate } from '../../util/truncate.js';

export function zendeskAutocompleteValue(article: ZendeskSearchResult, query: string) {
	const updatedAt = new Date(article.updated_at ?? article.created_at);
	const prefix = `${article.id}${DJS_QUERY_SEPARATOR}${updatedAt.getTime()}${DJS_QUERY_SEPARATOR}`;

	return `${prefix}${query.slice(0, AUTOCOMPLETE_MAX_NAME_LENGTH - prefix.length)}`;
}

function autocompleteMap(elements: ZendeskSearchResult[], query: string) {
	return elements.map((entry) => {
		return {
			name: truncate(entry.title, AUTOCOMPLETE_MAX_NAME_LENGTH),
			value: zendeskAutocompleteValue(entry, query),
		};
	});
}

export async function zendeskQuery(query: string, developer = false) {
	const base = developer ? DISCORD_HELPDESK_DEV_BASE : DISCORD_HELPDESK_BASE;
	const search = new URLSearchParams({
		query,
		per_page: String(AUTOCOMPLETE_MAX_ITEMS),
	});
	const url = `${base}/help_center/articles/search?${String(search)}`;

	return (await fetch(url, {
		headers: {
			'Content-Type': 'application/json',
		},
	}).then(async (res) => res.json())) as ZendeskSearchResponse;
}

export async function zendeskAutocomplete(res: Response, query: string, developer = false) {
	if (query.length < 1) {
		return;
	}

	const result = await zendeskQuery(query, developer);
	const choices = autocompleteMap(result.results, query);

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
