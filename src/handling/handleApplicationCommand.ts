import { hideLinkEmbed, hyperlink } from '@discordjs/builders';
import Collection from '@discordjs/collection';
import { APIApplicationCommandInteraction, ApplicationCommandType } from 'discord-api-types/v10';
import { Doc } from 'discordjs-docs-parser';
import { Response } from 'polka';
import { algoliaResponse } from '../functions/algoliaResponse';
import { resolveOptionsToDocsAutoComplete } from '../functions/autocomplete/docsAutoComplete';
import { djsDocs } from '../functions/docs';
import { mdnSearch } from '../functions/mdn';
import { nodeSearch } from '../functions/node';
import { showTag, reloadTags, Tag } from '../functions/tag';
import { DiscordDocsCommand } from '../interactions/discorddocs';
import { GuideCommand } from '../interactions/guide';
import { MdnCommand } from '../interactions/mdn';
import { NodeCommand } from '../interactions/node';
import { TagCommand } from '../interactions/tag';
import { TagReloadCommand } from '../interactions/tagreload';
import {
	transformInteraction,
	ArgumentsOf,
	EMOJI_ID_CLYDE_BLURPLE,
	prepareErrorResponse,
	EMOJI_ID_GUIDE,
	prepareResponse,
} from '../util';

type CommandName = 'discorddocs' | 'docs' | 'guide' | 'invite' | 'mdn' | 'node' | 'tag' | 'tagreload';

export async function handleApplicationCommand(
	res: Response,
	message: APIApplicationCommandInteraction,
	tagCache: Collection<string, Tag>,
) {
	const data = message.data;
	if (data.type === ApplicationCommandType.ChatInput) {
		const options = data.options ?? [];
		const name = data.name as CommandName;
		const args = transformInteraction(options);

		switch (name) {
			case 'discorddocs': {
				const castArgs = args as ArgumentsOf<typeof DiscordDocsCommand>;
				await algoliaResponse(
					res,
					process.env.DDOCS_ALGOLIA_APP!,
					process.env.DDOCS_ALOGLIA_KEY!,
					'discord',
					castArgs.query,
					EMOJI_ID_CLYDE_BLURPLE,
					castArgs.target,
				);
				break;
			}

			case 'docs': {
				const resolved = resolveOptionsToDocsAutoComplete(options);
				if (!resolved) {
					prepareErrorResponse(res, `Payload looks different than expected`);
					break;
				}

				const { source, query, target } = resolved;
				const doc = await Doc.fetch(source, { force: true });
				(await djsDocs(res, doc, source, query, target)).end();
				break;
			}

			case 'guide': {
				const castArgs = args as ArgumentsOf<typeof GuideCommand>;
				await algoliaResponse(
					res,
					process.env.DJS_GUIDE_ALGOLIA_APP!,
					process.env.DJS_GUIDE_ALGOLIA_KEY!,
					'discordjs',
					castArgs.query,
					EMOJI_ID_GUIDE,
					castArgs.target,
				);
				break;
			}
			case 'invite': {
				prepareResponse(
					res,
					`${hyperlink(
						'(click here)',
						hideLinkEmbed(
							`https://discord.com/api/oauth2/authorize?client_id=${process.env
								.DISCORD_CLIENT_ID!}&scope=applications.commands`,
						),
					)}`,
					true,
				);
				break;
			}
			case 'mdn': {
				const castArgs = args as ArgumentsOf<typeof MdnCommand>;
				await mdnSearch(res, castArgs.query, castArgs.target);
				break;
			}
			case 'node': {
				const castArgs = args as ArgumentsOf<typeof NodeCommand>;
				await nodeSearch(res, castArgs.query, castArgs.version, castArgs.target);
				break;
			}
			case 'tag': {
				const castArgs = args as ArgumentsOf<typeof TagCommand>;
				await showTag(res, castArgs.query, tagCache, castArgs.target);
				break;
			}
			case 'tagreload': {
				const castArgs = args as ArgumentsOf<typeof TagReloadCommand>;
				await reloadTags(res, tagCache, castArgs.remote ?? false);
				break;
			}
		}
	}
}
