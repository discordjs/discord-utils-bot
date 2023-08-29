import { ApplicationCommandOptionType } from 'discord-api-types/v10';
import { PACKAGES } from '../functions/djsDocs.js';

const SUBCOMMAND_DESCRIPTION_PREFIX = '[EXPERIMENTAL] Search documentation for' as const;
const BASE_OPTIONS = [
	{
		type: ApplicationCommandOptionType.String,
		name: 'query',
		description: 'Phrase to search for',
		required: true,
		autocomplete: true,
	},
	{
		type: ApplicationCommandOptionType.User,
		name: 'target',
		description: 'User to mention',
		required: false,
	},
	{
		type: ApplicationCommandOptionType.Boolean,
		name: 'hide',
		description: 'Hide command output (default: false)',
		required: false,
	},
	{
		type: ApplicationCommandOptionType.String,
		name: 'version',
		description: 'Version of the package to query (default: latest stable)',
		required: false,
		autocomplete: true,
	},
] as const;

function buildSubCommand(name: String) {
	return {
		type: ApplicationCommandOptionType.Subcommand,
		name,
		description: `${SUBCOMMAND_DESCRIPTION_PREFIX} discord.js@${name}`,
		options: BASE_OPTIONS,
	};
}

export const DocsDevCommand = {
	name: 'docsdev',
	description: 'Display discord.js documentation',
	options: PACKAGES.map((name) => buildSubCommand(name)),
	default_member_permissions: '0',
} as const;
