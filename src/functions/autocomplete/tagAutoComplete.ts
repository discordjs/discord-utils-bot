import Collection from '@discordjs/collection';
import { APIApplicationCommandInteractionDataOption, InteractionResponseType } from 'discord-api-types/v10';
import { Response } from 'polka';
import { TagCommand } from '../../interactions/tag';
import { transformInteraction } from '../../util/interactionOptions';
import { Tag } from '../tag';

export function tagAutoComplete(
	res: Response,
	options: APIApplicationCommandInteractionDataOption[],
	tagCache: Collection<string, Tag>,
): Response {
	const { query } = transformInteraction<typeof TagCommand>(options);
	const results: { name: string; value: string }[] = [];

	// eslint-disable-next-line @typescript-eslint/prefer-optional-chain
	if (query && query.length) {
		const keywordMatches: { name: string; value: string }[] = [];
		const contentMatches: { name: string; value: string }[] = [];
		const exactKeywords: { name: string; value: string }[] = [];
		const lowerQuery = query.toLowerCase();
		for (const [key, tag] of tagCache.entries()) {
			const exactKeyword = tag.keywords.find((s) => s.toLowerCase() === lowerQuery);
			const includesKeyword = tag.keywords.find((s) => s.toLowerCase().includes(lowerQuery));
			const isContentMatch = tag.content.toLowerCase().includes(lowerQuery);
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
				.filter((t) => t.hoisted)
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
				choices: results.slice(0, 19),
			},
			type: InteractionResponseType.ApplicationCommandAutocompleteResult,
		}),
	);

	return res;
}
