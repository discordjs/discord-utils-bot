import { resolve, dirname } from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { config } from 'dotenv';
import { fetch } from 'undici';
import { API_BASE_DISCORD } from '../util/constants.js';
import { logger } from '../util/logger.js';
import { PrerepeaseApplicationCommandContextType, PrerepeaseApplicationIntegrationType } from './auxtypes.js';

config({ path: resolve(dirname(fileURLToPath(import.meta.url)), '../../.env') });

export async function deploy(data: any, dev = false) {
	const midRoute = dev ? `/guilds/${process.env.DISCORD_DEVGUILD_ID!}` : '';
	const route = `${API_BASE_DISCORD}/applications/${process.env.DISCORD_CLIENT_ID!}${midRoute}/commands`;

	try {
		logger.info(`Starting update on route ${route}`);
		const res = await fetch(route, {
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bot ${process.env.DISCORD_TOKEN!}`,
			},
			method: 'put',
			body: JSON.stringify(
				dev
					? data
					: data.map((command: any) => ({
							...command,
							integration_types: [
								PrerepeaseApplicationIntegrationType.UserInstall,
								PrerepeaseApplicationIntegrationType.GuildInstall,
							],
							contexts: [
								PrerepeaseApplicationCommandContextType.Guild,
								PrerepeaseApplicationCommandContextType.PrivateChannel,
								PrerepeaseApplicationCommandContextType.BotDm,
							],
						})),
			),
		}).then(async (response) => response.json());
		logger.info(res as string);
		logger.info('Update completed');
	} catch (error) {
		logger.info('Request failed:');
		logger.error(error as Error);
	}
}
