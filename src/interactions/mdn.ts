import { ApplicationCommandOptionType } from 'discord-api-types/v10';

export const MdnCommand = {
	name: 'mdn',
	description: 'Search the Mozilla Developer Network documentation',
	options: [
		{
			type: ApplicationCommandOptionType.String,
			name: 'query',
			description: 'Class or method to search for',
			required: true,
			autocomplete: true,
		},
		{
			type: ApplicationCommandOptionType.Boolean,
			name: 'hide',
			description: 'Hide command output',
			required: false,
		},
		{
			type: ApplicationCommandOptionType.User,
			name: 'mention',
			description: 'User to mention',
			required: false,
		},
	],
} as const;
