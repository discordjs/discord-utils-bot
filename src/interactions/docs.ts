import { ApplicationCommandOptionType } from 'discord-api-types/v10';
import { reloadDjsVersions } from '../util/djsdocs.js';

const versions = await reloadDjsVersions();
if (!versions.packages.length) {
	throw new Error('Error while loading versions');
}

function buildSubCommandOptions(name: string) {
	return [
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
			description: 'Version of the package to use (default: Latest release)',
			choices: versions.versions
				.get(name)
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
		},
	] as const;
}

function buildSubCommand(name: string) {
	const cleanedName = name.replaceAll('.', '-');
	return {
		type: ApplicationCommandOptionType.Subcommand,
		name: cleanedName,
		description: `Search documentation for discordjs@${cleanedName}`,
		options: buildSubCommandOptions(name),
	};
}

export const DocsCommand = {
	name: 'docs',
	description: 'Display discord.js documentation',
	options: versions.packages.map((name) => buildSubCommand(name)),
} as const;
