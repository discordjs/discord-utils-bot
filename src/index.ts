import polka, { Middleware, NextHandler, Request, Response } from 'polka';
import { logger, jsonParser, prepareAck, prepareResponse, API_BASE_MDN, PREFIX_BUG, PREFIX_TEAPOT } from './util';
import { loadTags, Tag } from './functions/tag';
import Collection from '@discordjs/collection';
import { Doc } from 'discordjs-docs-parser';
import { InteractionType, APIInteraction } from 'discord-api-types/v10';
import { webcrypto } from 'node:crypto';
import { handleApplicationCommand } from './handling/handleApplicationCommand';
import { handleApplicationCommandAutocomplete } from './handling/handleApplicationCommandAutocomplete';
import { MDNIndexEntry } from './types/mdn';

// @ts-expect-error
const { subtle } = webcrypto;

const encoder = new TextEncoder();

function hex2bin(hex: string) {
	const buf = new Uint8Array(Math.ceil(hex.length / 2));
	for (let i = 0; i < buf.length; i++) {
		buf[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
	}
	return buf;
}

// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
const PUBKEY = subtle.importKey(
	'raw',
	hex2bin(process.env.DISCORD_PUBKEY!),
	{
		name: 'NODE-ED25519',
		namedCurve: 'NODE-ED25519',
		public: true,
	},
	true,
	['verify'],
);
const PORT = parseInt(process.env.PORT!, 10);

async function verify(req: Request, res: Response, next: NextHandler) {
	if (!req.headers['x-signature-ed25519']) {
		res.writeHead(401);
		return res.end();
	}
	const signature = req.headers['x-signature-ed25519'] as string;
	const timestamp = req.headers['x-signature-timestamp'] as string;

	if (!signature || !timestamp) {
		res.writeHead(401);
		return res.end();
	}

	const hexSignature = hex2bin(signature);

	// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
	const isValid = await subtle.verify(
		'NODE-ED25519',
		await PUBKEY,
		hexSignature,
		encoder.encode(timestamp + req.rawBody),
	);

	if (!isValid) {
		res.statusCode = 401;
		return res.end();
	}
	void next();
}

const tagCache: Collection<string, Tag> = new Collection();
const mdnIndexCache: MDNIndexEntry[] = [];
void loadTags(tagCache);
logger.info(`Tag cache loaded with ${tagCache.size} entries.`);

Doc.setGlobalOptions({
	escapeMarkdownLinks: true,
});

export async function start() {
	const mdnData = (await fetch(`${API_BASE_MDN}/en-US/search-index.json`)
		.then((r) => r.json())
		.catch(() => undefined)) as MDNIndexEntry[] | undefined;
	if (mdnData) {
		mdnIndexCache.push(...mdnData.map((r) => ({ title: r.title, url: `${r.url}` })));
	}

	polka()
		.use(jsonParser(), verify as Middleware)
		.post('/interactions', async (req, res) => {
			try {
				const message = req.body as APIInteraction;
				switch (message.type) {
					case InteractionType.Ping:
						prepareAck(res);
						break;
					case InteractionType.ApplicationCommand:
						await handleApplicationCommand(res, message, tagCache);
						break;
					case InteractionType.ApplicationCommandAutocomplete:
						await handleApplicationCommandAutocomplete(res, message, tagCache, mdnIndexCache);
						break;
					default:
						logger.warn(`Received interaction of type ${message.type}`);
						prepareResponse(res, `${PREFIX_TEAPOT} This shouldn't be here...`, true);
				}
			} catch (error) {
				logger.error(error as Error);
				prepareResponse(res, `${PREFIX_BUG} Looks like something went wrong here, please try again later!`, true);
			}

			res.end();
		})
		.listen(PORT);
	logger.info(`Listening for interactions on port ${PORT}.`);
}

process.on('unhandledRejection', (reason, promise) => {
	logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (err, origin) => {
	logger.error(`Caught exception: ${err.message}\nException origin: ${origin}`, err);
});

void start();
