import polka, { NextHandler, Request, Response, Middleware } from 'polka';
import { verifyKey } from 'discord-interactions';
import { logger } from './util/logger';
import { jsonParser } from './util/jsonParser';
import { prepareAck, prepareResponse } from './util/respond';
import { djsDocs } from './functions/docs';
import { djsGuide } from './functions/guide';
import { mdnSearch } from './functions/mdn';
import { nodeSearch } from './functions/node';
import { DEFAULT_DOCS_BRANCH, PREFIX_BUG, PREFIX_TEAPOT } from './util/constants';
import { loadTags, reloadTags, showTag, Tag } from './functions/tag';
import Collection from '@discordjs/collection';
import { Doc } from 'discordjs-docs-parser';
import { discordDeveloperDocs } from './functions/discorddocs';
import { InteractionType, APIInteraction, ApplicationCommandType } from 'discord-api-types/v10';
import { transformInteraction } from './util/interactionOptions';
import { ArgumentsOf } from './util/argumentsOf';
import { DiscordDocsCommand } from './interactions/discorddocs';
import { DocsCommand } from './interactions/docs';
import { GuideCommand } from './interactions/guide';
import { MdnCommand } from './interactions/mdn';
import { NodeCommand } from './interactions/node';
import { TagCommand } from './interactions/tag';
import { TagReloadCommand } from './interactions/tagreload';
import { djsDocsAutoComplete } from './functions/autocomplete/docsAutoComplete';
import { tagAutoComplete } from './functions/autocomplete/tagAutoComplete';

type CommandName =
	| 'discorddocs'
	| 'docs'
	| 'guide'
	| 'invite'
	| 'mdn'
	| 'node'
	| 'tag'
	| 'tagreload'
	| 'not_implemented';
type CommandAutoCompleteName = 'docs' | 'tag' | 'not_implemented';

const tagCache: Collection<string, Tag> = new Collection();
void loadTags(tagCache);
logger.info(`Tag cache loaded with ${tagCache.size} entries.`);

// Set built in escape markdown links to true
Doc.setGlobalOptions({
	escapeMarkdownLinks: true,
});

function verify(req: Request, res: Response, next: NextHandler) {
	const signature = req.headers['x-signature-ed25519'];
	const timestamp = req.headers['x-signature-timestamp'];

	if (!signature || !timestamp) {
		res.writeHead(401);
		return res.end();
	}
	const isValid = verifyKey(req.rawBody, signature as string, timestamp as string, process.env.DISCORD_PUBKEY!);
	if (!isValid) {
		res.statusCode = 401;
		return res.end();
	}
	void next();
}

export function start() {
	polka()
		.use(jsonParser(), verify as Middleware)
		.post('/interactions', async (req, res) => {
			try {
				const message = req.body as APIInteraction;
				if (message.type === InteractionType.Ping) {
					prepareAck(res);
					res.end();
					return;
				}
				if (message.type === InteractionType.ApplicationCommand) {
					const data = message.data;
					if (data.type === ApplicationCommandType.ChatInput) {
						const options = data.options ?? [];
						const name = data.name as CommandName;
						const args = transformInteraction(options);

						switch (name) {
							case 'discorddocs': {
								const castArgs = args as ArgumentsOf<typeof DiscordDocsCommand>;
								(await discordDeveloperDocs(res, castArgs.query, castArgs.results, castArgs.target)).end();
								break;
							}

							case 'docs': {
								const castArgs = args as ArgumentsOf<typeof DocsCommand>;
								const doc = await Doc.fetch(castArgs.source ?? DEFAULT_DOCS_BRANCH, { force: true });
								(
									await djsDocs(
										res,
										doc,
										castArgs.source ?? DEFAULT_DOCS_BRANCH,
										castArgs.query,
										undefined,
										castArgs.target,
									)
								).end();
								break;
							}
							case 'guide': {
								const castArgs = args as ArgumentsOf<typeof GuideCommand>;
								await djsGuide(res, castArgs.query, castArgs.results, castArgs.target);
								break;
							}
							case 'invite': {
								prepareResponse(
									res,
									`Add the discord.js interaction to your server: [(click here)](<https://discord.com/api/oauth2/authorize?client_id=${process
										.env.DISCORD_CLIENT_ID!}&scope=applications.commands>)`,
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
								await showTag(res, castArgs.query, tagCache, undefined, castArgs.target);
								break;
							}
							case 'tagreload': {
								const castArgs = args as ArgumentsOf<typeof TagReloadCommand>;
								await reloadTags(res, tagCache, castArgs.remote ?? false);
								break;
							}
							default:
								logger.warn(`Unknown interaction received: ${name} guild: ${message.guild_id!}`);
						}
					}
				} else if (message.type === InteractionType.ApplicationCommandAutocomplete) {
					const data = message.data;
					const name = data.name as CommandAutoCompleteName;
					switch (name) {
						case 'docs': {
							await djsDocsAutoComplete(res, data.options);
							break;
						}
						case 'tag': {
							await tagAutoComplete(res, data.options, tagCache);
							break;
						}
						default:
							logger.warn(`Unknown auto complete received: ${name} guild: ${message.guild_id!}`);
					}
				} else {
					logger.warn(`Received interaction of type ${message.type}`);
					prepareResponse(res, `${PREFIX_BUG} This shouldn't be there...`, true);
				}

				res.end();
			} catch (error) {
				logger.error(error as Error);
				prepareResponse(res, `${PREFIX_TEAPOT} Looks like something went wrong here, please try again later!`, true);
			}
		})
		.listen(parseInt(process.env.PORT!, 10));
	logger.info(`Listening for interactions on port ${parseInt(process.env.PORT!, 10)}`);
}

start();
