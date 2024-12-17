import { Buffer } from 'node:buffer';
import process from 'node:process';
import type { RawFile } from '@discordjs/rest';
import { REST } from '@discordjs/rest';
import * as TOML from '@ltd/j-toml';
import type { APIButtonComponent, APIModalSubmitInteraction } from 'discord-api-types/v10';
import { ButtonStyle, ComponentType, InteractionResponseType, MessageFlags, Routes } from 'discord-api-types/v10';
import type { Response } from 'polka';
import {
	EMOJI_ID_NO_TEST,
	VALIDATION_FAIL_COLOR,
	VALIDATION_WARNING_COLOR,
	VALIDATION_SUCCESS_COLOR,
} from '../../util/constants.js';
import { prepareErrorResponse, prepareHeader } from '../../util/respond.js';
import { validateTags } from '../../workflowFunctions/validateTags.js';

function parseTagShape(data: string) {
	const toml = TOML.parse(data, 1, '\n');
	const tag: [string, any | null] = Object.entries(toml)[0];
	const name = tag[0];
	// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
	const tagBody = tag[1];

	if (!name) {
		throw new Error('Unexpected tag shape. Needs name key (string).');
	}

	// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
	if (!tagBody?.keywords?.length || !Array.isArray(tagBody.keywords)) {
		throw new Error('Unexpected tag shape. Needs keywords (string[]).');
	}

	// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
	if (!tagBody?.content?.length || typeof tagBody.content !== 'string') {
		throw new Error('Unexpected tag shape. Needs content (string).');
	}

	return {
		name,
		body: tagBody as { content: string; keywords: string[] },
	};
}

export async function testTagModalSubmit(res: Response, message: APIModalSubmitInteraction) {
	const tagData = message.data.components?.[0].components[0];
	if (!tagData) {
		prepareErrorResponse(
			res,
			'Tag format looks different than expected. Make sure to include the tag name and keywords and review our [guidelines and examples](https://github.com/discordjs/discord-utils-bot).',
		);
		return res;
	}

	try {
		const parsedTag = parseTagShape(tagData.value);
		const result = await validateTags(false, tagData.value);

		const hasErrors = result.errors.length;
		const hasWarnings = result.warnings.length;
		const attachments: RawFile[] = [];
		const buttons: APIButtonComponent[] = [
			{
				type: ComponentType.Button,
				style: ButtonStyle.Secondary,
				emoji: {
					id: EMOJI_ID_NO_TEST,
				},
				custom_id: 'testtag-clear',
			},
		];

		if (hasErrors) {
			attachments.push({
				name: 'errors.ansi',
				data: Buffer.from(result.errors.join('\n')),
			});
		}

		if (hasWarnings) {
			attachments.push({
				name: 'warnings.ansi',
				data: Buffer.from(result.warnings.join('\n')),
			});
		}

		if (!hasWarnings && !hasErrors) {
			buttons.push({
				type: ComponentType.Button,
				style: ButtonStyle.Link,
				label: 'Create a PR!',
				url: 'https://github.com/discordjs/discord-utils-bot/compare',
			});
		}

		const rest = new REST();
		rest.setToken(process.env.DISCORD_TOKEN!);
		await rest.post(Routes.interactionCallback(message.id, message.token), {
			body: {
				type: InteractionResponseType.ChannelMessageWithSource,
				data: {
					allowed_mentions: { parse: [] },
					content: parsedTag.body.content,
					flags: message.data.custom_id === 'testtag-hide' ? MessageFlags.Ephemeral : 0,
					embeds: [
						{
							color: hasErrors
								? VALIDATION_FAIL_COLOR
								: hasWarnings
									? VALIDATION_WARNING_COLOR
									: VALIDATION_SUCCESS_COLOR,
							description: [
								`**Name:** \`${parsedTag.name}\``,
								`**Keywords:** ${parsedTag.body.keywords.map((key) => `\`${key}\``).join(', ')}`,
								`**Validation**: ${
									hasErrors ? 'invalid' : hasWarnings ? `valid (${result.warnings.length} warnings)` : 'valid'
								}`,
							].join('\n'),
						},
					],
					components: buttons.length
						? [
								{
									type: ComponentType.ActionRow,
									components: buttons,
								},
							]
						: [],
				},
			},
			files: attachments,
		});
	} catch (_error) {
		const error = _error as Error;

		prepareHeader(res);
		prepareErrorResponse(res, error.message);
		return res;
	}

	prepareHeader(res);
	res.write(JSON.stringify({}));
	return res;
}
