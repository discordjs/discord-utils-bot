import { ApplicationCommandOptionType } from 'discord-api-types/v10';

export const GuideCommand = {
	name: 'guide',
	description: 'Search discordjs.guide',
	options: [
		{
			type: ApplicationCommandOptionType.String,
			name: 'query',
			description: 'Phrase to search for',
			autocomplete: true,
			required: true,
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
