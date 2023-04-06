import { ApplicationCommandOptionType } from 'discord-api-types/v10';

const SUBCOMMAND_DESCRIPTION_PREFIX = 'Display docs for' as const;
const BASE_OPTIONS = [
	{
		type: ApplicationCommandOptionType.String,
		name: 'query',
		description: 'Class or Class#method combination to search for',
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
		description: 'Hide command output',
		required: false,
	},
]

export const DocsCommand = {
	name: 'docs',
	description: 'Display discord.js documentation',
	options: [
		{
			type: ApplicationCommandOptionType.Subcommand,
			name: 'discord-js-v13',
			description: `${SUBCOMMAND_DESCRIPTION_PREFIX} discord.js@v13-lts`,
			options: BASE_OPTIONS,
		},
		{
			type: ApplicationCommandOptionType.Subcommand,
			name: 'discord-js-v14',
			description: `${SUBCOMMAND_DESCRIPTION_PREFIX} discord.js@latest`,
			options: BASE_OPTIONS,
		},
		{
			type: ApplicationCommandOptionType.Subcommand,
			name: 'discord-js-dev',
			description: `${SUBCOMMAND_DESCRIPTION_PREFIX} discord.js@dev`,
			options: BASE_OPTIONS,
		},
		{
			type: ApplicationCommandOptionType.Subcommand,
			name: 'collection',
			description: `${SUBCOMMAND_DESCRIPTION_PREFIX} @discordjs/collection`,
			options: BASE_OPTIONS,
		},
		{
			type: ApplicationCommandOptionType.Subcommand,
			name: 'voice',
			description: `${SUBCOMMAND_DESCRIPTION_PREFIX} @discordjs/voice`,
			options: BASE_OPTIONS,
		},
		{
			type: ApplicationCommandOptionType.Subcommand,
			name: 'builders',
			description: `${SUBCOMMAND_DESCRIPTION_PREFIX} @discordjs/builders`,
			options: BASE_OPTIONS,
		},
	],
} as const;
