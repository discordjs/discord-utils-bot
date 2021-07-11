import fetch from 'node-fetch';
import { Response } from 'polka';
import { logger } from '../util/logger';
import { prepareErrorResponse, prepareResponse } from '../util/respond';
import { encode } from 'querystring';
import { API_BASE_MDN, EMOJI_MDN } from '../util/constants';

const cache = new Map<string, any>();

export async function mdnSearch(res: Response, query: string, target?: string): Promise<Response> {
	query = query.trim();
	try {
		const qString = `${API_BASE_MDN}/api/v1/search?${encode({ q: query })}`;
		let hit = cache.get(qString);
		if (!hit) {
			const result = await fetch(qString).then((r) => r.json());
			hit = result.documents?.[0];
			cache.set(qString, hit);
		}

		if (!hit) {
			prepareErrorResponse(res, `No search result found for query \`${query}\``);
			return res;
		}

		const url = `${API_BASE_MDN}${hit.mdn_url as string}`;

		const linkReplaceRegex = /\[(.+?)\]\((.+?)\)/g;
		const boldCodeBlockRegex = /`\*\*(.*)\*\*`/g;
		const intro = hit.summary
			.replace(/\s+/g, ' ')
			.replace(linkReplaceRegex, `[$1](${API_BASE_MDN}<$2>)`)
			.replace(boldCodeBlockRegex, '**`$1`**');

		const parts = [`${EMOJI_MDN} \ __[**${hit.title as string}**](<${url}>)__`, intro];

		prepareResponse(
			res,
			`${target ? `*Documentation suggestion for <@${target}>:*\n` : ''}${parts.join('\n')}`,
			false,
			target ? [target] : [],
		);

		return res;
	} catch (error) {
		logger.error(error);
		prepareErrorResponse(res, `Something went wrong.`);
		return res;
	}
}
