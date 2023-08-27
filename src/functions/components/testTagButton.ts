import { Response } from 'polka';
import { prepareHeader } from '../../util';
import { InteractionResponseType } from 'discord-api-types/v10';

export function testTagButton(res: Response) {
	prepareHeader(res);
	res.write(
		JSON.stringify({
			type: InteractionResponseType.UpdateMessage,
			data: {
				components: [],
				embeds: [],
			},
		}),
	);

	return res;
}
