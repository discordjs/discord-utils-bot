import process from 'node:process';
import { hideLinkEmbed, hyperlink, inlineCode } from '@discordjs/builders';
import type { Collection } from '@discordjs/collection';
import type { APIApplicationCommandInteraction } from 'discord-api-types/v10';
import { ApplicationCommandType } from 'discord-api-types/v10';
import type { Response } from 'polka';
import { container } from 'tsyringe';
import { algoliaResponse } from '../functions/algoliaResponse.js';
import { resolveOptionsToDocsAutoComplete } from '../functions/autocomplete/docsAutoComplete.js';
import { djsDocs } from '../functions/docs.js';
import { mdnSearch } from '../functions/mdn.js';
import { nodeSearch } from '../functions/node.js';
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
import type { ArgumentsOf } from '../util/argumentsOf.js';
import { EMOJI_ID_CLYDE_BLURPLE, EMOJI_ID_DTYPES, EMOJI_ID_GUIDE } from '../util/constants.js';
import { fetchDjsVersions, kDjsVersions } from '../util/djsdocs.js';
import { transformInteraction } from '../util/interactionOptions.js';
import { prepareErrorResponse, prepareResponse } from '../util/respond.js';

type CommandName =
	| 'discorddocs'
	| 'docs'
	| 'dtypes'
	| 'guide'
	| 'mdn'
	| 'node'
	| 'reloadversions'
	| 'tag'
	| 'tagreload'
	| 'testtag';

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
			case 'docs': {
				const resolved = resolveOptionsToDocsAutoComplete(options);
				if (!resolved) {
					prepareErrorResponse(res, `Payload looks different than expected`);
					break;
				}

				const { query, version, ephemeral } = resolved;
				await djsDocs(res, version, query, ephemeral);
				break;
			}

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
					castArgs.hide,
				);

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
					castArgs.hide,
				);
				break;
			}

			case 'mdn': {
				const castArgs = args as ArgumentsOf<typeof MdnCommand>;
				await mdnSearch(res, castArgs.query, castArgs.hide);
				break;
			}

			case 'node': {
				const castArgs = args as ArgumentsOf<typeof NodeCommand>;
				await nodeSearch(res, castArgs.query, castArgs.version, castArgs.hide);
				break;
			}

			case 'tag': {
				const castArgs = args as ArgumentsOf<typeof TagCommand>;
				showTag(res, castArgs.query, tagCache, castArgs.hide);
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

			case 'reloadversions': {
				const versions = await fetchDjsVersions();
				container.register(kDjsVersions, { useValue: res });

				prepareResponse(res, `Reloaded versions for all ${inlineCode('@discordjs')} packages.`, true);
				break;
			}
		}
	}
}
