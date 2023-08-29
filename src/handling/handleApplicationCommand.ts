import process from 'node:process';
import { hideLinkEmbed, hyperlink } from '@discordjs/builders';
import type Collection from '@discordjs/collection';
import type { APIApplicationCommandInteraction } from 'discord-api-types/v10';
import { ApplicationCommandType } from 'discord-api-types/v10';
import { Doc } from 'discordjs-docs-parser';
import type { Response } from 'polka';
import { algoliaResponse } from '../functions/algoliaResponse.js';
import { resolveOptionsToDocsAutoComplete } from '../functions/autocomplete/docsAutoComplete.js';
import { djsDocs } from '../functions/docs.js';
import { mdnSearch } from '../functions/mdn.js';
import { nodeSearch } from '../functions/node.js';
import { reloadNpmVersions } from '../functions/npm.js';
import type { Tag } from '../functions/tag.js';
import { showTag, reloadTags } from '../functions/tag.js';
import { testTag } from '../functions/testtag.js';
import type { DiscordDocsCommand } from '../interactions/discorddocs.js';
import type { DTypesCommand } from '../interactions/discordtypes.js';
import type { GuideCommand } from '../interactions/guide.js';
import type { MdnCommand } from '../interactions/mdn.js';
import type { NodeCommand } from '../interactions/node.js';
import type { TagCommand } from '../interactions/tag.js';
import type { TagReloadCommand } from '../interactions/tagreload.js';
import type { TestTagCommand } from '../interactions/testtag.js';
import type { CustomSourcesString } from '../types/discordjs-docs-parser.js';
import type { ArgumentsOf } from '../util/argumentsOf.js';
import { EMOJI_ID_CLYDE_BLURPLE, EMOJI_ID_DTYPES, EMOJI_ID_GUIDE } from '../util/constants.js';
import { transformInteraction } from '../util/interactionOptions.js';
import { prepareErrorResponse, prepareResponse } from '../util/respond.js';

type CommandName =
	| 'discorddocs'
	| 'docs'
	| 'dtypes'
	| 'guide'
	| 'invite'
	| 'mdn'
	| 'node'
	| 'npmreload'
	| 'tag'
	| 'tagreload'
	| 'testtag';

export async function handleApplicationCommand(
	res: Response,
	message: APIApplicationCommandInteraction,
	tagCache: Collection<string, Tag>,
	customSources: Map<CustomSourcesString, string>,
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
					process.env.DDOCS_ALGOLIA_KEY!,
					'discord',
					castArgs.query,
					EMOJI_ID_CLYDE_BLURPLE,
					'discord',
					castArgs.target,
					castArgs.hide,
				);
				break;
			}

			case 'dtypes': {
				const castArgs = args as ArgumentsOf<typeof DTypesCommand>;

				await algoliaResponse(
					res,
					process.env.DTYPES_ALGOLIA_APP!,
					process.env.DTYPES_ALGOLIA_KEY!,
					'discord-api-types',
					castArgs.query,
					EMOJI_ID_DTYPES,
					'dtypes',
					castArgs.target,
					castArgs.hide,
				);

				break;
			}

			case 'docs': {
				const resolved = resolveOptionsToDocsAutoComplete(options);
				if (!resolved) {
					prepareErrorResponse(res, `Payload looks different than expected`);
					break;
				}

				const { source, query, target, ephemeral } = resolved;
				// @ts-expect-error: This implements custom sources
				const doc = await Doc.fetch(source, { force: true });
				djsDocs(res, doc, source, query, target, ephemeral).end();
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
					'guide',
					castArgs.target,
					castArgs.hide,
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
				await mdnSearch(res, castArgs.query, castArgs.target, castArgs.hide);
				break;
			}

			case 'node': {
				const castArgs = args as ArgumentsOf<typeof NodeCommand>;
				await nodeSearch(res, castArgs.query, castArgs.version, castArgs.target, castArgs.hide);
				break;
			}

			case 'tag': {
				const castArgs = args as ArgumentsOf<typeof TagCommand>;
				showTag(res, castArgs.query, tagCache, castArgs.target, castArgs.hide);
				break;
			}

			case 'testtag': {
				const castArgs = args as ArgumentsOf<typeof TestTagCommand>;
				testTag(res, castArgs.hide ?? true);
				break;
			}

			case 'tagreload': {
				const castArgs = args as ArgumentsOf<typeof TagReloadCommand>;
				await reloadTags(res, tagCache, castArgs.remote ?? false);
				break;
			}

			case 'npmreload': {
				await reloadNpmVersions(res, customSources);
				break;
			}
		}
	}
}
