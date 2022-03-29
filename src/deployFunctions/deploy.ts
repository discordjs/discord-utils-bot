import { config } from 'dotenv';
import { resolve } from 'path';
import { fetch } from 'undici';
import { logger, API_BASE_DISCORD } from '../util';
config({ path: resolve(__dirname, '../../.env') });

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
			body: JSON.stringify(data),
		}).then((r) => r.json());
		logger.info(res as string);
		logger.info('Update completed');
	} catch (error) {
		logger.info('Request failed:');
		logger.error(error as Error);
	}
}
