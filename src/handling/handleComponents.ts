import type { APIMessageComponentInteraction } from 'discord-api-types/v10';
import { ComponentType } from 'discord-api-types/v10';
import type { Response } from 'polka';
import { testTagButton } from '../functions/components/testTagButton.js';
import { logger } from '../util/logger.js';

type ComponentName = 'testtag-clear';

export function handleComponent(res: Response, message: APIMessageComponentInteraction) {
	const data = message.data;
	const name = data.custom_id as ComponentName;
	switch (data.component_type) {
		case ComponentType.Button: {
			if (name === 'testtag-clear') {
				testTagButton(res);
			}

			break;
		}

		default:
			logger.info(data, `Received unknown component`);
	}
}
