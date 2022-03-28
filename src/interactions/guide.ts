import { ApplicationCommandOptionType } from 'discord-api-types/v10';

export const GuideCommand = {
	name: 'guide',
	description: 'Search discordjs.guide',
	options: [
		{
			type: ApplicationCommandOptionType.String,
			name: 'query',
			description: 'Phrase to search for',
			required: true,
		},
		{
			type: ApplicationCommandOptionType.User,
			name: 'target',
			description: 'User to mention',
			required: false,
		},
		{
			type: ApplicationCommandOptionType.Integer,
			name: 'results',
			description: 'How many search results to display at most',
			required: false,
			choices: [
				{
					name: '1 result',
					value: 1,
				},
				{
					name: '2 results (default)',
					value: 2,
				},
				{
					name: '3 results',
					value: 3,
				},
				{
					name: '4 results',
					value: 4,
				},
				{
					name: '5 results',
					value: 5,
				},
			],
		},
	],
} as const;
