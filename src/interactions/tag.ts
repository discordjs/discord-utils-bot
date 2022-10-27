import { ApplicationCommandOptionType } from 'discord-api-types/v10';

export const TagCommand = {
	name: 'tag',
	description: 'Send a tag by name or alias',
	options: [
		{
			type: ApplicationCommandOptionType.String,
			name: 'query',
			description: 'Tag name or alias',
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
			type: ApplicationCommandOptionType.Integer,
			name: 'version',
			description: 'The version of the tag (default: v14)',
			required: false,
			choices: [
				{
					name: 'v14',
					value: 14,
				},
				{
					name: 'v13',
					value: 13,
				},
			],
		},
	],
} as const;
