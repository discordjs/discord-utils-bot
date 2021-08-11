import {
	bold,
	formatEmoji,
	hideLinkEmbed,
	hyperlink,
	inlineCode,
	italic,
	underscore,
	userMention,
} from '@discordjs/builders';
import fetch from 'node-fetch';
import { Response } from 'polka';
import { encode } from 'querystring';
import { API_BASE_MDN, EMOJI_ID_MDN } from '../util/constants';
import { logger } from '../util/logger';
import { prepareErrorResponse, prepareResponse } from '../util/respond';

const cache = new Map<string, Document>();

export async function mdnSearch(res: Response, query: string, target?: string): Promise<Response> {
	query = query.trim();
	try {
		const qString = `${API_BASE_MDN}/api/v1/search?${encode({ q: query })}`;
		let hit = cache.get(qString);
		if (!hit) {
			const result = (await fetch(qString).then((r) => r.json())) as MdnAPI;
			hit = result.documents?.[0];

			if (hit) {
				cache.set(qString, hit);
			}
		}

		if (!hit) {
			prepareErrorResponse(res, `No search result found for query ${inlineCode(query)}`);
			return res;
		}

		const url = API_BASE_MDN + hit.mdn_url;

		const linkReplaceRegex = /\[(.+?)\]\((.+?)\)/g;
		const boldCodeBlockRegex = /`\*\*(.*)\*\*`/g;
		const intro = hit.summary
			.replace(/\s+/g, ' ')
			.replace(linkReplaceRegex, hyperlink('$1', hideLinkEmbed(`${API_BASE_MDN}$2`)))
			.replace(boldCodeBlockRegex, bold(inlineCode('$1')));

		const parts = [
			`${formatEmoji(EMOJI_ID_MDN) as string} \ ${hyperlink(underscore(bold(hit.title)), hideLinkEmbed(url))}`,
			intro,
		];

		prepareResponse(
			res,
			`${target ? `${italic(`Documentation suggestion for ${userMention(target)}:`)}\n` : ''}${parts.join('\n')}`,
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

interface MdnAPI {
	documents?: Document[];
	metadata: Metadata;
	suggestions: any[];
}

interface Document {
	mdn_url: string;
	score: number;
	title: string;
	locale: string;
	slug: string;
	popularity: number;
	archived: boolean;
	summary: string;
	highlight: Highlight;
}

interface Highlight {
	body: string[];
	title: string[];
}

interface Metadata {
	took_ms: number;
	total: Total;
	size: number;
	page: number;
}

interface Total {
	value: number;
	relation: string;
}
