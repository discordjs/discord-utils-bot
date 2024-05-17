import { ApplicationCommandOptionType } from 'discord-api-types/v10';

export const DiscordDocsCommand = {
	name: 'discorddocs',
	description: 'Search Discord developer documentation',
	options: [
		{
			type: ApplicationCommandOptionType.String,
			name: 'query',
			description: 'Phrase to search for',
			autocomplete: true,
			required: true,
		},
		{
			type: ApplicationCommandOptionType.Boolean,
			name: 'hide',
			description: 'Hide command output',
			required: false,
		},
	],
} as const;
