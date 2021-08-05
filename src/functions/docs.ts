import { Response } from 'polka';
import Doc from 'discord.js-docs';
import { prepareErrorResponse, prepareResponse, prepareSelectMenu } from '../util/respond';
import { EMOJI_ID_DJS, EMOJI_ID_DJS_DEV, PREFIX_FAIL } from '../util/constants';

import { formatEmoji, truncate } from '../util';

function escapeMDLinks(s = ''): string {
	return s.replace(/\[(.+?)\]\((.+?)\)/g, '[$1](<$2>)');
}

function formatInheritance(prefix: string, inherits: DocElement[], doc: Doc): string {
	const res = inherits.map((element: any) => element.flat(5));
	return ` (${prefix} ${res.map((element) => escapeMDLinks(doc.formatType(element))).join(' and ')})`;
}

export function resolveElementString(element: DocElement, doc: Doc): string {
	const parts = [];
	if (element.docType === 'event') parts.push('**(event)** ');
	if (element.static) parts.push('**(static)** ');
	parts.push(`__**${escapeMDLinks(element.link ?? '')}**__`);
	if (element.extends) parts.push(formatInheritance('extends', element.extends, doc));
	if (element.implements) parts.push(formatInheritance('implements', element.implements, doc));
	if (element.access === 'private') parts.push(' **PRIVATE**');
	if (element.deprecated) parts.push(' **DEPRECATED**');

	const s = escapeMDLinks(element.formattedDescription ?? element.description ?? '').split('\n');
	const description = s.length > 1 ? `${s[0]} [(more...)](<${element.url ?? ''}>)` : s[0];

	return `${parts.join('')}\n${description}`;
}

function buildSelectOption(result: DocElement, emojiId: string) {
	return {
		label: result.formattedName,
		value: result.formattedName,
		description: truncate(result.formattedDescription ?? result.description ?? 'No description found', 47),
		emoji: {
			id: emojiId,
		},
	};
}

export function fetchDocResult(source: string, doc: Doc, query: string, user?: string, target?: string): string | null {
	const element = doc.get(...query.split(/\.|#/));
	if (!element) return null;
	const icon = formatEmoji(source === 'master' ? EMOJI_ID_DJS_DEV : EMOJI_ID_DJS);
	const messageParts = [];
	if (user || target) {
		messageParts.push('*Documentation suggestion');
	}
	if (target) {
		messageParts.push(` for <@${target}>`);
	}
	if (user) {
		messageParts.push(` selected by <@${user}>`);
	}
	if (user || target) {
		messageParts.push('*\n');
	}
	messageParts.push(`${icon} ${resolveElementString(element, doc)}`);

	return messageParts.join('');
}

export function djsDocs(
	res: Response,
	doc: Doc,
	source: string,
	query: string,
	user?: string,
	target?: string,
): Response {
	query = query.trim();

	const singleResult = fetchDocResult(source, doc, query, user, target);
	if (singleResult) {
		prepareResponse(res, singleResult, false, target ? [target] : [], [], 4);
		return res;
	}

	const results = doc.search(query);
	if (results?.length) {
		prepareSelectMenu(
			res,
			`${PREFIX_FAIL} No match. Here are some search results:`,
			results.map((r) => buildSelectOption(r, source === 'master' ? EMOJI_ID_DJS_DEV : EMOJI_ID_DJS)),
			4,
			`docsearch|${target ?? ''}|${source}`,
			true,
		);
		return res;
	}

	prepareErrorResponse(res, `Nothing found with provided parameters.`);
	return res;
}
