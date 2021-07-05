import { badRequest, badData } from '@hapi/boom';
import type { Request, Response, NextHandler } from 'polka';

declare module 'polka' {
	export interface Request {
		rawBody: string;
	}
}

export const jsonParser = () => async (req: Request, _: Response, next: NextHandler) => {
	if (!req.headers['content-type']?.startsWith('application/json')) return next(badRequest('Unexpected content type'));
	req.setEncoding('utf8');

	try {
		let data = '';
		for await (const chunk of req) data += chunk;
		req.rawBody = data;
		req.body = JSON.parse(data);

		await next();
	} catch (e) {
		void next(badData(e?.toString()));
	}
};
