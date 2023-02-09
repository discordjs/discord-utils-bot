import { ApplicationCommandOptionType } from "discord-api-types/v10";

export const InviteCommand = {
	name: 'invite',
	description: 'Use discord.js docs in your server!',
	options: [
		{
		type: ApplicationCommandOptionType.Boolean,
		name: 'ephemeral',
		description: 'Whether to reply ephemerally',
		required: false,
		},
	]
} as const;
