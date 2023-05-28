import { Response } from 'polka';
import { prepareHeader } from '../util';
import { ComponentType, InteractionResponseType } from 'discord-api-types/v10';

const PLACEHOLDER = [
	'[tagname]',
	'keywords = ["tagname", "alias"]',
	'content = """',
	'Put your tag content here!',
	'"""',
].join('\n');

export function testTag(res: Response, hide: boolean): Response {
	prepareHeader(res);
	res.write(
		JSON.stringify({
			type: InteractionResponseType.Modal,
			data: {
				custom_id: `testtag-${hide ? 'hide' : 'show'}`,
				title: 'Enter the tag data to test',
				components: [
					{
						type: ComponentType.ActionRow,
						components: [
							{
								custom_id: 'testtaginput',
								label: 'Tag data',
								style: 2,
								min_length: 1,
								max_length: 4000,
								placeholder: PLACEHOLDER,
								value: PLACEHOLDER,
								required: true,
								type: ComponentType.TextInput,
							},
						],
					},
				],
			},
		}),
	);
	return res;
}
