import { Response } from 'polka';
import { PREFIX_FAIL } from './constants';

export function prepareHeader(response: Response) {
	response.setHeader('Content-Type', 'application/json');
}

export function prepareSelectMenu(
	response: Response,
	content: string,
	options: any[],
	type: number,
	customId: string,
	ephemeral = false,
) {
	prepareHeader(response);
	response.write(
		JSON.stringify({
			data: {
				content,
				components: [
					{
						type: 1,
						components: [
							{
								type: 3,
								custom_id: customId,
								options,
							},
						],
					},
				],
				flags: ephemeral ? 64 : 0,
			},
			type,
		}),
	);
}

export function prepareResponse(
	response: Response,
	content: string,
	ephemeral = false,
	users: string[] = [],
	parse: string[] = [],
	type = 4,
): void {
	prepareHeader(response);
	response.write(
		JSON.stringify({
			data: {
				content,
				flags: ephemeral ? 64 : 0,
				// eslint-disable-next-line @typescript-eslint/naming-convention
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
			type: 1,
		}),
	);
}
