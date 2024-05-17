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
					name: 'v16',
					value: 'latest-v16.x',
				},
				{
					name: 'v18 (default)',
					value: 'latest-v18.x',
				},
				{
					name: 'v20 (current)',
					value: 'latest-v20.x',
				},
			],
		},
		{
			type: ApplicationCommandOptionType.Boolean,
			name: 'hide',
			description: 'Hide command output',
			required: false,
		},
	],
} as const;
