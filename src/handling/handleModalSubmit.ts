import { APIModalSubmitInteraction } from 'discord-api-types/v10';
import { Response } from 'polka';
import { testTagModalSubmit } from '../functions/modals/testTagModalSubmit';

type ModalSubmitName = 'testtag-hide' | 'testtag-show';

export async function handleModalSubmit(res: Response, message: APIModalSubmitInteraction) {
	const data = message.data;
	const name = data.custom_id as ModalSubmitName;
	switch (name) {
		case 'testtag-hide':
		case 'testtag-show': {
			await testTagModalSubmit(res, message);
			break;
		}
	}
}
