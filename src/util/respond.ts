import { InteractionResponseType, MessageFlags } from 'discord-api-types/v10';
import { Response } from 'polka';
import { PREFIX_FAIL } from './constants';

export function prepareHeader(response: Response) {
	response.setHeader('Content-Type', 'application/json');
}

export function prepareResponse(
	response: Response,
	content: string,
	ephemeral = false,
	users: string[] = [],
	parse: string[] = [],
	type = InteractionResponseType.ChannelMessageWithSource,
): void {
	prepareHeader(response);
	response.write(
		JSON.stringify({
			data: {
				content,
				flags: ephemeral ? MessageFlags.Ephemeral : 0,
				allowed_mentions: { parse, users },
				components: [],
			},
			type,
		}),
	);
}

export function prepareErrorResponse(response: Response, content: string): void {
	prepareResponse(response, `${PREFIX_FAIL} ${content}`, true);
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
