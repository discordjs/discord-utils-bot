import { ApplicationCommandOptionType } from 'discord-api-types/v10';

export const TagReloadCommand = {
	name: 'tagreload',
	description: 'Reload tags',
	options: [
		{
			type: ApplicationCommandOptionType.Boolean,
			name: 'remote',
			description: 'Use remote repository tags (default: false, use local files)',
			required: false,
		},
	],
} as const;
