import { DiscordDocsCommand } from '../interactions/discorddocs';
import { DocsCommand } from '../interactions/docs';
import { GuideCommand } from '../interactions/guide';
import { InviteCommand } from '../interactions/invite';
import { MdnCommand } from '../interactions/mdn';
import { NodeCommand } from '../interactions/node';
import { TagCommand } from '../interactions/tag';
import { TestTagCommand } from '../interactions/testtag';
import { deploy } from './deploy';

void deploy([
	DiscordDocsCommand,
	DocsCommand,
	GuideCommand,
	InviteCommand,
	MdnCommand,
	NodeCommand,
	TagCommand,
	TestTagCommand,
]);
