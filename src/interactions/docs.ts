import { ApplicationCommandOptionType } from 'discord-api-types/v10';

export const DocsCommand = {
	name: 'docs',
	description: 'Display discord.js documentation',
	options: [
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
			type: ApplicationCommandOptionType.String,
			name: 'source',
			description: 'Source repository to use',
			choices: [
				{
					name: 'Collection (util structure)',
					value: 'collection',
				},
				{
					name: 'discord.js@dev',
					value: 'main',
				},
				{
					name: 'Stable (default)',
					value: 'stable',
				},
				{
					name: 'Voice',
					value: 'voice',
				},
				{
					name: 'Builders',
					value: 'builders',
				},
				{
					name: 'RPC',
					value: 'rpc',
				},
			],
		},
	],
} as const;
