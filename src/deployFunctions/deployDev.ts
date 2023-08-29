import { DocsDevCommand } from '../interactions/docsdev.js';
import { NpmReloadCommand } from '../interactions/npmreload.js';
import { TagReloadCommand } from '../interactions/tagreload.js';
import { deploy } from './deploy.js';

void deploy(
	[NpmReloadCommand, TagReloadCommand, DocsDevCommand].map((interaction) => ({
		...interaction,
		description: `🛠️ ${interaction.description}`,
	})),
	true,
);
