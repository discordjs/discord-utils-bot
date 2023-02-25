import { ApplicationCommandOptionType } from 'discord-api-types/v10';

export const NodeCommand = {
	name: 'node',
	description: 'Search the Node.js documentation',
	options: [
		{
			type: ApplicationCommandOptionType.String,
			name: 'query',
			description: 'Class, method or event to search for',
			required: true,
		},
		{
			type: ApplicationCommandOptionType.String,
			name: 'version',
			description: 'Node.js version to search documentation for',
			required: false,
			choices: [
				{
					name: 'v12',
					value: 'latest-v12.x',
				},
				{
					name: 'v14',
					value: 'latest-v14.x',
				},
				{
					name: 'v16 (default)',
					value: 'latest-v16.x',
				},
			],
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
	],
} as const;
