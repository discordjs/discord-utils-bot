import { APIMessageComponentInteraction, ComponentType } from 'discord-api-types/v10';
import { Response } from 'polka';
import { logger } from '../util';
import { testTagButton } from '../functions/components/testTagButton';

type ComponentName = 'testtag-clear';

export function handleComponent(res: Response, message: APIMessageComponentInteraction) {
	const data = message.data;
	const name = data.custom_id as ComponentName;
	switch (data.component_type) {
		case ComponentType.Button: {
			switch (name) {
				case 'testtag-clear': {
					testTagButton(res);
					break;
				}
			}
			break;
		}
		default:
			logger.info(data, `Received unknown component`);
	}
}
