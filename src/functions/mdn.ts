import { bold, hideLinkEmbed, hyperlink, inlineCode, italic, underscore, userMention } from '@discordjs/builders';
import type { Response } from 'polka';
import { fetch } from 'undici';
import { API_BASE_MDN, EMOJI_ID_MDN } from '../util/constants.js';
import { logger } from '../util/logger.js';
import { prepareErrorResponse, prepareResponse } from '../util/respond.js';

const cache = new Map<string, Document>();

function escape(text: string) {
	return text.replaceAll('||', '|\u200B|').replaceAll('*', '\\*');
}

export async function mdnSearch(res: Response, query: string, user?: string, ephemeral?: boolean): Promise<Response> {
	const trimmedQuery = query.trim();
	try {
		const qString = `${API_BASE_MDN}/${trimmedQuery}/index.json`;
		// eslint-disable-next-line sonarjs/no-empty-collection
		let hit = cache.get(qString);
		if (!hit) {
			try {
				const result = (await fetch(qString).then(async (response) => response.json())) as APIResult;
				hit = result.doc;
			} catch {
				prepareErrorResponse(res, 'Invalid result. Make sure to select an entry from the autocomplete.');
				return res;
			}
		}

		const url = API_BASE_MDN + hit.mdn_url;

		const linkReplaceRegex = /\[(.+?)]\((.+?)\)/g;
		const boldCodeBlockRegex = /`\*\*(.*)\*\*`/g;
		const intro = escape(hit.summary)
			.replaceAll(/\s+/g, ' ')
			.replaceAll(linkReplaceRegex, hyperlink('$1', hideLinkEmbed(`${API_BASE_MDN}$2`)))
			.replaceAll(boldCodeBlockRegex, bold(inlineCode('$1')));

		const parts = [
			`<:mdn:${EMOJI_ID_MDN}>  ${underscore(bold(hyperlink(escape(hit.title), hideLinkEmbed(url))))}`,
			intro,
		];

		prepareResponse(res, parts.join('\n'), {
			ephemeral,
			suggestion: user ? { userId: user, kind: 'documentation' } : undefined,
		});

		return res;
	} catch (error) {
		logger.error(error as Error);
		prepareErrorResponse(res, `Something went wrong.`);
		return res;
	}
}

type APIResult = {
	doc: Document;
};

type Document = {
	archived: boolean;
	highlight: Highlight;
	locale: string;
	mdn_url: string;
	popularity: number;
	score: number;
	slug: string;
	summary: string;
	title: string;
};

type Highlight = {
	body: string[];
	title: string[];
};
