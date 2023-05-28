import { ApplicationCommandOptionType } from 'discord-api-types/v10';

export const TestTagCommand = {
	name: 'testtag',
	description: 'Show and validate a tag (TOML modal input)',
	options: [
		{
			type: ApplicationCommandOptionType.Boolean,
			name: 'hide',
			description: 'Hide command output (default: true)',
			required: false,
		},
	],
} as const;
