import { bold, formatEmoji, hideLinkEmbed, hyperlink, underscore } from '@discordjs/builders';
import Doc from 'discord.js-docs';
import { Response } from 'polka';
import { suggestionString, truncate } from '../util';
import { EMOJI_ID_DJS, EMOJI_ID_DJS_DEV } from '../util/constants';
import { prepareErrorResponse, prepareResponse, prepareSelectMenu } from '../util/respond';

function escapeMDLinks(s = ''): string {
	return s.replace(/\[(.+?)\]\((.+?)\)/g, '[$1](<$2>)');
}

function formatInheritance(prefix: string, inherits: DocElement[], doc: Doc): string {
	const res = inherits.map((element: any) => element.flat(5));
	return ` (${prefix} ${res.map((element) => escapeMDLinks(doc.formatType(element))).join(' and ')})`;
}

export function resolveElementString(element: DocElement, doc: Doc): string {
	const parts = [];
	if (element.docType === 'event') parts.push(`${bold('(event)')} `);
	if (element.static) parts.push(`${bold('(static)')} `);
	parts.push(underscore(bold(escapeMDLinks(element.link ?? ''))));
	if (element.extends) parts.push(formatInheritance('extends', element.extends, doc));
	if (element.implements) parts.push(formatInheritance('implements', element.implements, doc));
	if (element.access === 'private') parts.push(` ${bold('PRIVATE')}`);
	if (element.deprecated) parts.push(` ${bold('DEPRECATED')}`);

	const s = escapeMDLinks(element.formattedDescription ?? element.description ?? '').split('\n');
	const description = s.length > 1 ? `${s[0]} ${hyperlink('(more...)', hideLinkEmbed(element.url ?? ''))}` : s[0];

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
	const icon = formatEmoji(source === 'main' ? EMOJI_ID_DJS_DEV : EMOJI_ID_DJS) as string;
	return suggestionString('documentation', `${icon} ${resolveElementString(element, doc)}`, user, target);
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
	const iconId = source === 'main' ? EMOJI_ID_DJS_DEV : EMOJI_ID_DJS;
	if (results?.length) {
		prepareSelectMenu(
			res,
			`${formatEmoji(iconId) as string} No match. Select a similar search result to send it:`,
			results.map((r) => buildSelectOption(r, iconId)),
			4,
			`docsearch|${target ?? ''}|${source}`,
			true,
		);
		return res;
	}

	prepareErrorResponse(res, 'Nothing found with provided parameters.');
	return res;
}
