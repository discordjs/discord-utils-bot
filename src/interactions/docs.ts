import { ApplicationCommandOptionType } from 'discord-api-types/v10';
import { type DjsVersions, reloadDjsVersions } from '../util/djsdocs.js';

const versions = await reloadDjsVersions();
export async function buildDocsCommand(versions: DjsVersions) {
	return {
		name: 'docs',
		description: 'Display discord.js documentation',
		options: [
			{
				type: ApplicationCommandOptionType.String,
				name: 'query',
				description: 'Phrase to search for',
				required: true,
				autocomplete: true,
			},
			{
				type: ApplicationCommandOptionType.Boolean,
				name: 'hide',
				description: 'Hide command output (default: False)',
				required: false,
			},
			{
				type: ApplicationCommandOptionType.String,
				name: 'version',
				description: 'Version of discord.js to use (default: Latest release)',
				choices: versions.versions
					.get('discord.js')
					?.slice(0, 25)
					.map((version) => {
						return {
							name: version,
							value: version,
						};
					}) ?? [
					{
						name: 'main',
						value: 'main',
					},
				],
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
}

export const DocsCommand = await buildDocsCommand(versions);
