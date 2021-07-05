import polka, { NextHandler, Request, Response } from 'polka';
import { verifyKey } from 'discord-interactions';
import { logger } from './util/logger';
import { jsonParser } from './util/jsonParser';
import { prepareAck, prepareResponse } from './util/respond';
import { djsDocs } from './functions/docs';
import { djsGuide } from './functions/guide';
import { mdnSearch } from './functions/mdn';
import { nodeSearch } from './functions/node';
import { DEFAULT_DOCS_BRANCH, PREFIX_BUG, PREFIX_TEAPOT } from './util/constants';
import { loadTags, reloadTags, searchTag, showTag, Tag } from './functions/tag';
import Collection from '@discordjs/collection';

const tagCache: Collection<string, Tag> = new Collection();
void loadTags(tagCache);
logger.info(`Tag cache loaded with ${tagCache.size} entries.`);

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
		.use(jsonParser(), verify)
		.post('/interactions', async (req, res) => {
			try {
				const message = req.body;
				if (message.type === 1) {
					prepareAck(res);
					return res.end();
				}
				if (message.type === 2) {
					const options = message.data.options ?? [];
					const name = message.data.name;

					const args = Object.fromEntries(
						options.map(({ name, value }: { name: string; value: any }) => [name, value]),
					);

					if (name === 'docs') {
						return (await djsDocs(res, args.source ?? DEFAULT_DOCS_BRANCH, args.query, args.target)).end();
					}

					if (name === 'guide') {
						return (await djsGuide(res, args.query, args.results, args.target)).end();
					}

					if (name === 'mdn') {
						return (await mdnSearch(res, args.query, args.target)).end();
					}

					if (name === 'node') {
						return (await nodeSearch(res, args.query, args.target)).end();
					}

					if (name === 'tag') {
						return (await showTag(res, args.query, tagCache, args.target)).end();
					}

					if (name === 'tagsearch') {
						return (await searchTag(res, args.query, tagCache)).end();
					}

					if (name === 'tagreload') {
						return (await reloadTags(res, tagCache, args.remote)).end();
					}

					if (name === 'invite') {
						prepareResponse(
							res,
							`Add the discord.js interaction to your server: [(click here)](<https://discord.com/api/oauth2/authorize?client_id=${process
								.env.DISCORD_CLIENT_ID!}&scope=applications.commands>)`,
							true,
						);
						return res.end();
					}

					logger.warn(`Unknown interaction received: ${name as string} guild: ${message.guild_id as string}`);
				}
				logger.warn(`Received interaction of type ${message.type as string}`);
				prepareResponse(res, `${PREFIX_BUG} This shouldn't be there...`, true);
				res.end();
			} catch (error) {
				logger.error(error);
				prepareResponse(res, `${PREFIX_TEAPOT} Looks like something wrent wrong here, please try again later!`, true);
			}
		})
		.listen(parseInt(process.env.PORT!, 10));
	logger.info(`Listening for interactions on port ${parseInt(process.env.PORT!, 10)}`);
}

start();
