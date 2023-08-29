import { badRequest, badData } from '@hapi/boom';
import type { Request, Response, NextHandler, Middleware } from 'polka';

declare module 'polka' {
	// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
	export interface Request {
		rawBody: string;
	}
}

// eslint-disable-next-line unicorn/consistent-function-scoping
export const jsonParser = (): Middleware => async (req: Request, _: Response, next: NextHandler) => {
	if (!req.headers['content-type']?.startsWith('application/json')) return next(badRequest('Unexpected content type'));
	req.setEncoding('utf8');

	try {
		let data = '';
		for await (const chunk of req) data += chunk;
		req.rawBody = data;
		// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
		req.body = JSON.parse(data);

		return void next();
	} catch (error) {
		return next(badData((error as Error).message));
	}
};
