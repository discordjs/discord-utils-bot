import 'reflect-metadata';
import { DiscordDocsCommand } from '../interactions/discorddocs.js';
import { DTypesCommand } from '../interactions/discordtypes.js';
import { DocsCommand } from '../interactions/docs.js';
import { GuideCommand } from '../interactions/guide.js';
import { MdnCommand } from '../interactions/mdn.js';
import { NodeCommand } from '../interactions/node.js';
import { TagCommand } from '../interactions/tag.js';
import { TestTagCommand } from '../interactions/testtag.js';
import { deploy } from './deploy.js';

const staticGlobalCommands = [
	DiscordDocsCommand,
	GuideCommand,
	MdnCommand,
	NodeCommand,
	TagCommand,
	TestTagCommand,
	DTypesCommand,
];

void deploy([...staticGlobalCommands, DocsCommand]);
