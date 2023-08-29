import type Collection from '@discordjs/collection';
import type { APIApplicationCommandInteractionDataOption } from 'discord-api-types/v10';
import { InteractionResponseType } from 'discord-api-types/v10';
import type { Response } from 'polka';
import type { TagCommand } from '../../interactions/tag.js';
import { AUTOCOMPLETE_MAX_ITEMS } from '../../util/constants.js';
import { transformInteraction } from '../../util/interactionOptions.js';
import type { Tag } from '../tag.js';

export function tagAutoComplete(
	res: Response,
	options: APIApplicationCommandInteractionDataOption[],
	tagCache: Collection<string, Tag>,
): Response {
	const { query } = transformInteraction<typeof TagCommand>(options);
	const results: { name: string; value: string }[] = [];

	if (query.length) {
		const keywordMatches: { name: string; value: string }[] = [];
		const contentMatches: { name: string; value: string }[] = [];
		const exactKeywords: { name: string; value: string }[] = [];
		const cleanedQuery = query.toLowerCase().replaceAll(/\s+/g, '-');

		for (const [key, tag] of tagCache.entries()) {
			const exactKeyword =
				tag.keywords.some((text) => text.toLowerCase() === cleanedQuery) || key.toLowerCase() === cleanedQuery;
			const includesKeyword =
				tag.keywords.some((text) => text.toLowerCase().includes(cleanedQuery)) ||
				key.toLowerCase().includes(cleanedQuery);
			const isContentMatch = tag.content.toLowerCase().includes(cleanedQuery);
			if (exactKeyword) {
				exactKeywords.push({
					name: `✅ ${key}`,
					value: key,
				});
			} else if (includesKeyword) {
				keywordMatches.push({
					name: `🔑 ${key}`,
					value: key,
				});
			} else if (isContentMatch) {
				contentMatches.push({
					name: `📄 ${key}`,
					value: key,
				});
			}
		}

		results.push(...exactKeywords, ...keywordMatches, ...contentMatches);
	} else {
		results.push(
			...tagCache
				.filter((tag) => tag.hoisted)
				.map((_, key) => ({
					name: `📌 ${key}`,
					value: key,
				})),
		);
	}

	res.setHeader('Content-Type', 'application/json');
	res.write(
		JSON.stringify({
			data: {
				choices: results.slice(0, AUTOCOMPLETE_MAX_ITEMS - 1),
			},
			type: InteractionResponseType.ApplicationCommandAutocompleteResult,
		}),
	);

	return res;
}
