import { ApplicationCommandOptionType } from 'discord-api-types/v10';

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
		type: ApplicationCommandOptionType.Boolean,
		name: 'hide',
		description: 'Hide command output (default: false)',
		required: false,
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
	options: ['discord-js'].map((name) => buildSubCommand(name)),
	default_member_permissions: '0',
} as const;
