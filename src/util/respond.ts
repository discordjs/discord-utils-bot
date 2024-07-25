import { italic } from '@discordjs/builders';
import { InteractionResponseType, MessageFlags } from 'discord-api-types/v10';
import type { Response } from 'polka';
import { PREFIX_FAIL } from './constants.js';
import { truncate } from './truncate.js';

export function prepareHeader(response: Response) {
	response.setHeader('Content-Type', 'application/json');
}

export function prepareResponse(
	response: Response,
	content: string,
	options?: {
		ephemeral?: boolean;
		suggestion?: {
			kind: string;
			userId: string;
		};
	},
): void {
	prepareHeader(response);
	const prefixedContent = options?.suggestion
		? `${italic(`${options.suggestion.kind} suggestion for <@${options.suggestion.userId}>:`)}\n${content}`
		: content;
	response.write(
		JSON.stringify({
			data: {
				content: truncate(prefixedContent, 4_000, ''),
				flags: options?.ephemeral ? MessageFlags.Ephemeral | MessageFlags.SuppressEmbeds : MessageFlags.SuppressEmbeds,
				allowed_mentions: options?.suggestion ? { users: [options.suggestion.userId] } : { parse: [] },
				components: [],
			},
			type: InteractionResponseType.ChannelMessageWithSource,
		}),
	);
}

export function prepareDeferResponse(response: Response, ephemeral = false) {
	prepareHeader(response);
	response.write(
		JSON.stringify({
			type: InteractionResponseType.DeferredChannelMessageWithSource,
			data: {
				flags: ephemeral ? MessageFlags.Ephemeral | MessageFlags.SuppressEmbeds : MessageFlags.SuppressEmbeds,
			},
		}),
	);
}

export function prepareErrorResponse(response: Response, content: string): void {
	prepareResponse(response, `${PREFIX_FAIL} ${content}`, { ephemeral: true });
}

export function prepareAck(response: Response) {
	prepareHeader(response);
	response.statusCode = 200;
	response.write(
		JSON.stringify({
			type: InteractionResponseType.Pong,
		}),
	);
}
