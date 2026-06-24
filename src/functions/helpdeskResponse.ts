import { hyperlink, inlineCode } from '@discordjs/builders';
import type { Response } from 'polka';
import type { ZendeskArticle, ZendeskEntity } from '../types/zendesk';
import {
	DISCORD_HELPDESK_ARTICLES_BASE,
	DISCORD_HELPDESK_DEV_ARTICLES_BASE,
	DJS_QUERY_SEPARATOR,
	DOT,
	EMOJI_ID_CLYDE_BLURPLE,
	EMOJI_ID_GEAR_BLURPLE,
	EXTERNAL_LINK,
	MAX_MESSAGE_LENGTH,
	SUGGESTION_PREFIX_ALLOWANCE,
} from '../util/constants.js';
import {
	SectionPartType,
	findRelevantDocsSectionFuzzy,
	parseGithubDocsSections,
	sectionPartToText,
} from '../util/discordDocs.js';
import { helpdeskTurndownService } from '../util/helpdeskturndown.js';
import { logger } from '../util/logger.js';
import { prepareErrorResponse, prepareResponse } from '../util/respond.js';
import { zendeskAutocompleteValue, zendeskQuery } from './autocomplete/helpdeskAutoComplete.js';

const articleCache = new Map<number, ZendeskEntity>();

async function fetchHelpdeskArticle(id: number, autocompleteTimestamp: number, dev = false) {
	const hit = articleCache.get(id);
	if (hit) {
		const relevantTimestamp = hit.updated_at ?? hit.created_at;
		const updatedAt = new Date(relevantTimestamp).getTime();

		if (updatedAt >= autocompleteTimestamp) {
			logger.debug(
				{
					id,
					autocompleteTimestamp,
					dev,
				},
				`Cache hit on support article ${id}`,
			);
			return hit;
		}
	}

	const base = dev ? DISCORD_HELPDESK_DEV_ARTICLES_BASE : DISCORD_HELPDESK_ARTICLES_BASE;
	const res = (await fetch(`${base}/help_center/en-us/articles/${id}.json`).then(async (res) =>
		res.json(),
	)) as ZendeskArticle;

	articleCache.set(res.article.id, res.article);
	return res.article;
}

export async function helpdeskResponse(
	res: Response,
	query: string,
	isDev?: boolean,
	user?: string,
	ephemeral?: boolean,
	secondAttempt = false,
) {
	const [articleId, timestampString, ...originalQuery] = query.split(DJS_QUERY_SEPARATOR);

	const numberId = Number.parseInt(articleId, 10);
	if (Number.isNaN(numberId)) {
		if (secondAttempt) {
			prepareErrorResponse(res, `No documentation found for ${inlineCode(originalQuery.join(DJS_QUERY_SEPARATOR))}.`);
			return res;
		}

		const searchFallback = await zendeskQuery(articleId, isDev);
		const article = searchFallback.results[0];
		if (!article) {
			prepareErrorResponse(res, `No documentation found for ${inlineCode(articleId)}.`);
			return res;
		}

		return helpdeskResponse(res, zendeskAutocompleteValue(article, articleId), isDev, user, ephemeral, true);
	}

	const timestamp = Number.parseInt(timestampString, 10);
	const article = await fetchHelpdeskArticle(numberId, timestamp, isDev);

	const turnedDown = helpdeskTurndownService.turndown(article.body);
	const bodyParts = ['---', `title: ${article.title}`, '---', ...turnedDown.split(/\n+/)];

	const parsedSections = parseGithubDocsSections(bodyParts);
	const relevantSection = findRelevantDocsSectionFuzzy(parsedSections, originalQuery.join(DJS_QUERY_SEPARATOR), true);

	if (!relevantSection) {
		prepareErrorResponse(res, `No documentation found for ${inlineCode(query)}.`);
		return res;
	}

	const emoji = isDev ? `<:developers:${EMOJI_ID_GEAR_BLURPLE}>` : `<:discord:${EMOJI_ID_CLYDE_BLURPLE}>`;
	const headlinePrefix = heading(emoji, HeadingLevel.Three);
	const hasSameSiteLinkAnchor = relevantSection.linkAnchor?.startsWith('#');
	const healineLinkUrl = hasSameSiteLinkAnchor ? `${article.html_url}${relevantSection.linkAnchor}` : article.html_url;
	const headlineLinkLabel = hasSameSiteLinkAnchor ? `${article.name} ${DOT} ${relevantSection.headline}` : article.name;

	const headline = [headlinePrefix, hyperlink(`${headlineLinkLabel} ${EXTERNAL_LINK}`, healineLinkUrl)].join(' ');
	const contentParts = [headline];

	let totalLength = headline.length + SUGGESTION_PREFIX_ALLOWANCE;
	for (const part of relevantSection.parts) {
		if (part.type === SectionPartType.Preamble || part.type === SectionPartType.Image) {
			continue;
		}

		const partText = sectionPartToText(part);
		totalLength += partText.length + 1;

		if (totalLength > MAX_MESSAGE_LENGTH) {
			break;
		}

		contentParts.push(partText);
	}

	const result = contentParts.join('\n');
	prepareResponse(res, result, {
		ephemeral,
		suggestion: user ? { userId: user, kind: 'article' } : undefined,
	});

	return res;
}
