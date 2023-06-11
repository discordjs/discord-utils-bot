import { ApplicationCommandOptionType } from 'discord-api-types/v10';

const QUERY_DESCRIPTION = 'Type, Enum or Interface to search for' as const;
const TARGET_DESCRIPTION = 'User to mention' as const;
const VERSION_DESCRIPTION = 'Attempts to filter the results to the specified version' as const;
const EPHEMERAL_DESCRIPTION = 'Hide command output' as const;

export const DTypesCommand = {
	name: 'dtypes',
	description: 'Display discord-api-types documentation',
	options: [
		{
			type: ApplicationCommandOptionType.String,
			name: 'query',
			description: QUERY_DESCRIPTION,
			required: true,
			autocomplete: true,
		},
		{
			type: ApplicationCommandOptionType.User,
			name: 'target',
			description: TARGET_DESCRIPTION,
			required: false,
		},
		{
			type: ApplicationCommandOptionType.String,
			name: 'version',
			description: VERSION_DESCRIPTION,
			required: false,
			choices: [
				{
					name: 'No filter (default)',
					value: 'no-filter',
				},
				{
					name: 'v10',
					value: 'v10',
				},
				{
					name: 'v9',
					value: 'v9',
				},
				{
					name: 'v8',
					value: 'v8',
				},
			],
		},
		{
			type: ApplicationCommandOptionType.Boolean,
			name: 'hide',
			description: EPHEMERAL_DESCRIPTION,
			required: false,
		},
	],
} as const;
