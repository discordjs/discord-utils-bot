import { ApplicationCommandOptionType } from 'discord-api-types/v10';

const QUERY_DESCRIPTION = 'Class or Class#method combination to search for' as const;
const TARGET_DESCRIPTION = 'User to mention' as const;
const SUBCOMMAND_DESCRIPTION_PREFIX = 'Display docs for' as const;
const EPHEMERAL_DESCRIPTION = 'Hide command output' as const;

export const DocsCommand = {
	name: 'docs',
	description: 'Display discord.js documentation',
	options: [
		{
			type: ApplicationCommandOptionType.Subcommand,
			name: 'discord-js',
			description: `${SUBCOMMAND_DESCRIPTION_PREFIX} discord.js`,
			options: [
				{
					type: ApplicationCommandOptionType.String,
					name: 'query',
					description: QUERY_DESCRIPTION,
					required: true,
					autocomplete: true,
				},
				{
					type: ApplicationCommandOptionType.User,
					name: 'target',
					description: TARGET_DESCRIPTION,
					required: false,
				},
				{
					type: ApplicationCommandOptionType.Boolean,
					name: 'hide',
					description: EPHEMERAL_DESCRIPTION,
					required: false,
				},
			],
		},
		{
			type: ApplicationCommandOptionType.Subcommand,
			name: 'discord-js-dev',
			description: `${SUBCOMMAND_DESCRIPTION_PREFIX} discord.js@dev`,
			options: [
				{
					type: ApplicationCommandOptionType.String,
					name: 'query',
					description: QUERY_DESCRIPTION,
					required: true,
					autocomplete: true,
				},
				{
					type: ApplicationCommandOptionType.User,
					name: 'target',
					description: TARGET_DESCRIPTION,
					required: false,
				},
				{
					type: ApplicationCommandOptionType.Boolean,
					name: 'hide',
					description: EPHEMERAL_DESCRIPTION,
					required: false,
				},
			],
		},
		{
			type: ApplicationCommandOptionType.Subcommand,
			name: 'collection',
			description: `${SUBCOMMAND_DESCRIPTION_PREFIX} @discordjs/collection`,
			options: [
				{
					type: ApplicationCommandOptionType.String,
					name: 'query',
					description: QUERY_DESCRIPTION,
					required: true,
					autocomplete: true,
				},
				{
					type: ApplicationCommandOptionType.User,
					name: 'target',
					description: TARGET_DESCRIPTION,
					required: false,
				},
				{
					type: ApplicationCommandOptionType.Boolean,
					name: 'hide',
					description: EPHEMERAL_DESCRIPTION,
					required: false,
				},
			],
		},
		{
			type: ApplicationCommandOptionType.Subcommand,
			name: 'voice',
			description: `${SUBCOMMAND_DESCRIPTION_PREFIX} @discordjs/voice`,
			options: [
				{
					type: ApplicationCommandOptionType.String,
					name: 'query',
					description: QUERY_DESCRIPTION,
					required: true,
					autocomplete: true,
				},
				{
					type: ApplicationCommandOptionType.User,
					name: 'target',
					description: TARGET_DESCRIPTION,
					required: false,
				},
				{
					type: ApplicationCommandOptionType.Boolean,
					name: 'hide',
					description: EPHEMERAL_DESCRIPTION,
					required: false,
				},
			],
		},
		{
			type: ApplicationCommandOptionType.Subcommand,
			name: 'builders',
			description: `${SUBCOMMAND_DESCRIPTION_PREFIX} @discordjs/builders`,
			options: [
				{
					type: ApplicationCommandOptionType.String,
					name: 'query',
					description: QUERY_DESCRIPTION,
					required: true,
					autocomplete: true,
				},
				{
					type: ApplicationCommandOptionType.User,
					name: 'target',
					description: TARGET_DESCRIPTION,
					required: false,
				},
				{
					type: ApplicationCommandOptionType.Boolean,
					name: 'hide',
					description: EPHEMERAL_DESCRIPTION,
					required: false,
				},
			],
		},
	],
} as const;
