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
import { fetch } from 'undici';
import { Response } from 'polka';
import { API_BASE_MDN, EMOJI_ID_MDN, logger, prepareErrorResponse, prepareResponse } from '../util';

const cache = new Map<string, Document>();

function escape(text: string) {
	return text.replace(/\|\|/g, '|\u200B|').replace(/\*/g, '\\*');
}

export async function mdnSearch(res: Response, query: string, target?: string): Promise<Response> {
	query = query.trim();
	try {
		const qString = `${API_BASE_MDN}/${query}/index.json`;
		let hit = cache.get(qString);
		if (!hit) {
			try {
				const result = (await fetch(qString).then((r) => r.json())) as APIResult;
				hit = result.doc;
			} catch {
				prepareErrorResponse(res, 'Invalid result. Make sure to select an entry from the autocomplete.');
				return res;
			}
		}

		const url = API_BASE_MDN + hit.mdn_url;

		const linkReplaceRegex = /\[(.+?)\]\((.+?)\)/g;
		const boldCodeBlockRegex = /`\*\*(.*)\*\*`/g;
		const intro = escape(hit.summary)
			.replace(/\s+/g, ' ')
			.replace(linkReplaceRegex, hyperlink('$1', hideLinkEmbed(`${API_BASE_MDN}$2`)))
			.replace(boldCodeBlockRegex, bold(inlineCode('$1')));

		const parts = [
			`${formatEmoji(EMOJI_ID_MDN) as string} \ ${underscore(bold(hyperlink(escape(hit.title), hideLinkEmbed(url))))}`,
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
		logger.error(error as Error);
		prepareErrorResponse(res, `Something went wrong.`);
		return res;
	}
}

interface APIResult {
	doc: Document;
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
