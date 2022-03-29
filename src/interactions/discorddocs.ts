import { ApplicationCommandOptionType } from 'discord-api-types/v10';

export const DiscordDocsCommand = {
	name: 'discorddocs',
	description: 'Search discord developer documentation',
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
	],
} as const;
