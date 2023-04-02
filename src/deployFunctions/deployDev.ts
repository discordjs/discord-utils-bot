import { NpmReloadCommand } from '../interactions/npmreload';
import { TagReloadCommand } from '../interactions/tagreload';
import { deploy } from './deploy';

void deploy(
	[NpmReloadCommand, TagReloadCommand].map((t) => ({ ...t, description: `[alpha] ${t.description}` })),
	true,
);
