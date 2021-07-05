import { Response } from 'polka';
import { PREFIX_FAIL } from './constants';

export function prepareResponse(
	response: Response,
	content: string,
	ephemeral = false,
	users: string[] = [],
	parse: string[] = [],
): void {
	response.setHeader('Content-Type', 'application/json');
	response.write(
		JSON.stringify({
			data: {
				content,
				flags: ephemeral ? 64 : 0,
				// eslint-disable-next-line @typescript-eslint/naming-convention
				allowed_mentions: { parse, users },
			},
			type: 4,
		}),
	);
}

export function prepareErrorResponse(response: Response, content: string): void {
	prepareResponse(response, `${PREFIX_FAIL} ${content}`, true);
}

export function prepareAck(response: Response) {
	response.setHeader('Content-Type', 'application/json');
	response.statusCode = 200;
	response.write(
		JSON.stringify({
			type: 1,
		}),
	);
}
