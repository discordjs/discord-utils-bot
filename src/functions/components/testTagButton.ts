import { InteractionResponseType, MessageFlags } from 'discord-api-types/v10';
import type { Response } from 'polka';
import { prepareHeader } from '../../util/respond.js';

export function testTagButton(res: Response) {
	prepareHeader(res);
	res.write(
		JSON.stringify({
			type: InteractionResponseType.UpdateMessage,
			data: {
				components: [],
				embeds: [],
				attachments: [],
				flags: MessageFlags.SuppressEmbeds,
			},
		}),
	);

	return res;
}
