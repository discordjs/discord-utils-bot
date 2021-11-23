import { config } from 'dotenv';
import { resolve } from 'path';
import fetch from 'node-fetch';
import { API_BASE_DISCORD } from '../util/constants';
import { logger } from '../util/logger';

config({ path: resolve(__dirname, '../../.env') });

export async function deploy(data: any, dev = false) {
	const midRoute = dev ? `/guilds/${process.env.DISCORD_DEVGUILD_ID as string}` : '';
	const route = `${API_BASE_DISCORD}/applications/${process.env.DISCORD_CLIENT_ID as string}${midRoute}/commands`;

	try {
		logger.info('Starting update');
		const res = await fetch(route, {
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bot ${process.env.DISCORD_TOKEN as string}`,
			},
			method: 'put',
			body: JSON.stringify(data),
		}).then((r) => r.json());
		logger.info(res);
		logger.info('Update completed');
	} catch (error) {
		logger.info('Request failed:');
		logger.error(error as Error);
	}
}
