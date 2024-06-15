import 'reflect-metadata';
import { webcrypto } from 'node:crypto';
import process from 'node:process';
import { TextEncoder } from 'node:util';
import { Collection } from '@discordjs/collection';
import type { APIInteraction } from 'discord-api-types/v10';
import { InteractionType } from 'discord-api-types/v10';
import type { Middleware, NextHandler, Request, Response } from 'polka';
import polka from 'polka';
import { loadTags } from './functions/tag.js';
import type { Tag } from './functions/tag.js';
import { handleApplicationCommand } from './handling/handleApplicationCommand.js';
import { handleApplicationCommandAutocomplete } from './handling/handleApplicationCommandAutocomplete.js';
import { handleComponent } from './handling/handleComponents.js';
import { handleModalSubmit } from './handling/handleModalSubmit.js';
import type { MDNIndexEntry } from './types/mdn.js';
import { API_BASE_MDN, PREFIX_TEAPOT, PREFIX_BUG } from './util/constants.js';
import { reloadDjsVersions } from './util/djsdocs.js';
import { jsonParser } from './util/jsonParser.js';
import { logger } from './util/logger.js';
import { prepareAck, prepareResponse } from './util/respond.js';

if (process.env.ENVIRONMENT === 'debug') {
	logger.level = 'debug';
	logger.debug('=== DEBUG LOGGING ENABLED ===');
}

const { subtle } = webcrypto;

const encoder = new TextEncoder();

function hex2bin(hex: string) {
	const buf = new Uint8Array(Math.ceil(hex.length / 2));
	for (let index = 0; index < buf.length; index++) {
		buf[index] = Number.parseInt(hex.slice(index * 2, index * 2 + 2), 16);
	}

	return buf;
}

const PUBKEY = await subtle.importKey('raw', hex2bin(process.env.DISCORD_PUBKEY!), 'Ed25519', true, ['verify']);

const PORT = Number.parseInt(process.env.PORT!, 10);

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
	const isValid = await subtle.verify('Ed25519', PUBKEY, hexSignature, encoder.encode(timestamp + req.rawBody));

	if (!isValid) {
		res.statusCode = 401;
		return res.end();
	}

	return next();
}

const tagCache = new Collection<string, Tag>();
const mdnIndexCache: MDNIndexEntry[] = [];
await loadTags(tagCache);
logger.info(`Tag cache loaded with ${tagCache.size} entries.`);
await reloadDjsVersions();

export async function start() {
	const mdnData = (await fetch(`${API_BASE_MDN}/en-US/search-index.json`)
		.then(async (response) => response.json())
		.catch(() => undefined)) as MDNIndexEntry[] | undefined;
	if (mdnData) {
		mdnIndexCache.push(...mdnData.map((entry) => ({ title: entry.title, url: entry.url })));
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
					case InteractionType.ModalSubmit:
						await handleModalSubmit(res, message);
						break;
					case InteractionType.MessageComponent:
						handleComponent(res, message);
						break;

					default:
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

process.on('uncaughtException', (err, origin) => {
	logger.error(`Caught exception: ${err.message}\nException origin: ${origin}`, err);
});

process.on('unhandledRejection', (reason, promise) => {
	// eslint-disable-next-line no-console
	logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

void start();
