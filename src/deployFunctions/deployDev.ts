import { NpmReloadCommand } from '../interactions/npmreload.js';
import { TagReloadCommand } from '../interactions/tagreload.js';
import { deploy } from './deploy.js';

void deploy(
	[NpmReloadCommand, TagReloadCommand].map((interaction) => ({
		...interaction,
		description: `🛠️ ${interaction.description}`,
	})),
	true,
);
