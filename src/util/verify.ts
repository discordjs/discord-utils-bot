import { NextHandler, Request, Response } from 'polka';
import { webcrypto } from 'node:crypto';

// @ts-expect-error
const { subtle } = webcrypto;

const encoder = new TextEncoder();

function hex2bin(hex: string) {
	const buf = new Uint8Array(Math.ceil(hex.length / 2));
	for (let i = 0; i < buf.length; i++) {
		buf[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
	}
	return buf;
}

// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
const PUBKEY = subtle.importKey(
	'raw',
	hex2bin(process.env.DISCORD_PUBKEY!),
	{
		name: 'NODE-ED25519',
		namedCurve: 'NODE-ED25519',
		public: true,
	},
	true,
	['verify'],
);

export async function verify(req: Request, res: Response, next: NextHandler) {
	if (!req.headers['x-signature-ed25519']) {
		res.writeHead(401);
		return res.end();
	}
	const signature = req.headers['x-signature-ed25519'] as string;
	const timestamp = req.headers['x-signature-timestamp'] as string;

	if (!signature || !timestamp) {
		res.writeHead(401);
		return res.end();
	}

	const hexSignature = hex2bin(signature);

	// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
	const isValid = await subtle.verify(
		'NODE-ED25519',
		await PUBKEY,
		hexSignature,
		encoder.encode(timestamp + req.rawBody),
	);

	if (!isValid) {
		res.statusCode = 401;
		return res.end();
	}
	void next();
}
