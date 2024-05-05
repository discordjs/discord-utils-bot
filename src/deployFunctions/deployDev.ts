import 'reflect-metadata';
import { DjsVersionReloadCommand } from '../interactions/reloadVersioncache.js';
import { TagReloadCommand } from '../interactions/tagreload.js';
import { deploy } from './deploy.js';

void deploy(
	[DjsVersionReloadCommand, TagReloadCommand].map((interaction) => ({
		...interaction,
		description: `🛠️ ${interaction.description}`,
	})),
	true,
);
