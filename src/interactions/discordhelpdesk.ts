import type { RESTPostAPIApplicationCommandsJSONBody } from 'discord-api-types/v10';
import { ApplicationCommandOptionType, ApplicationCommandType } from 'discord-api-types/v10';

export const DiscordHelpdeskCommand = {
	type: ApplicationCommandType.ChatInput,
	name: 'discordhelpdesk',
	description: 'Search Discord support helpdesk articles',
	options: [
		{
			type: ApplicationCommandOptionType.Subcommand,
			name: 'general',
			description: 'Search general support helpdesk articles',
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
				{
					type: ApplicationCommandOptionType.User,
					name: 'mention',
					description: 'User to mention',
					required: false,
				},
			],
		},
		{
			type: ApplicationCommandOptionType.Subcommand,
			name: 'developer',
			description: 'Search developer support helpdesk articles',
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
				{
					type: ApplicationCommandOptionType.User,
					name: 'mention',
					description: 'User to mention',
					required: false,
				},
			],
		},
	],
} as const satisfies RESTPostAPIApplicationCommandsJSONBody;
