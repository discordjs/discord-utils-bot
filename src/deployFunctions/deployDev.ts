/* eslint-disable @typescript-eslint/restrict-template-expressions */
/* eslint-disable @typescript-eslint/no-unsafe-return */
import { deploy } from './deploy';

void deploy(
	// @ts-expect-error
	[].map((t) => ({ ...t, description: `[alpha] ${t.description}` })),
	true,
);
