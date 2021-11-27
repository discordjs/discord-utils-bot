import { bold, formatEmoji, hideLinkEmbed, hyperlink, underscore } from '@discordjs/builders';
import { Doc, DocElement, DocTypes, SourcesStringUnion } from 'discordjs-docs-parser';
import { Response } from 'polka';
import { suggestionString, truncate } from '../util';
import { prepareErrorResponse, prepareResponse, prepareSelectMenu } from '../util/respond';
import {
	EMOJI_ID_CLASS,
	EMOJI_ID_CLASS_DEV,
	EMOJI_ID_DJS,
	EMOJI_ID_DJS_DEV,
	EMOJI_ID_EVENT,
	EMOJI_ID_EVENT_DEV,
	EMOJI_ID_FIELD,
	EMOJI_ID_FIELD_DEV,
	EMOJI_ID_INTERFACE,
	EMOJI_ID_INTERFACE_DEV,
	EMOJI_ID_METHOD,
	EMOJI_ID_METHOD_DEV,
} from '../util/constants';

function docTypeEmojiId(docType: DocTypes | null, dev = false): string {
	switch (docType) {
		case DocTypes.Typedef:
			return dev ? EMOJI_ID_INTERFACE_DEV : EMOJI_ID_INTERFACE;
		case DocTypes.Prop:
			return dev ? EMOJI_ID_FIELD_DEV : EMOJI_ID_FIELD;
		case DocTypes.Class:
			return dev ? EMOJI_ID_CLASS_DEV : EMOJI_ID_CLASS;
		case DocTypes.Method:
			return dev ? EMOJI_ID_METHOD_DEV : EMOJI_ID_METHOD;
		case DocTypes.Event:
			return dev ? EMOJI_ID_EVENT_DEV : EMOJI_ID_EVENT;
		default:
			return dev ? EMOJI_ID_DJS_DEV : EMOJI_ID_DJS;
	}
}

function stripMd(s = ''): string {
	return s.replace(/[`\*_]/gi, '');
}

function extractGenericTypeInfill(type: string): string {
	const match = /<(?<type>[A-Za-z]+)>/.exec(type);
	return match?.groups?.type ? match.groups.type : type;
}

function formatInheritance(prefix: string, inherits: string[][], doc: Doc): string {
	const res = inherits.flatMap((element) => {
		if (Array.isArray(element)) return element.flat(5);
		return [element];
	});

	const inheritedLinks = res.map((element) => doc.get(extractGenericTypeInfill(element))?.link).filter(Boolean);

	if (!inheritedLinks.length) return '';

	return ` (${prefix} ${inheritedLinks.join(' and ')})`;
}

export function resolveElementString(element: DocElement, doc: Doc): string {
	const parts = [];
	if (element.docType === 'event') parts.push(`${bold('(event)')} `);
	if (element.static) parts.push(`${bold('(static)')} `);
	parts.push(underscore(bold(element.link)));
	if (element.extends) parts.push(formatInheritance('extends', element.extends, doc));
	if (element.implements) parts.push(formatInheritance('implements', element.implements, doc));
	if (element.access === 'private') parts.push(` ${bold('PRIVATE')}`);
	if (element.deprecated) parts.push(` ${bold('DEPRECATED')}`);

	const s = ((element.formattedDescription || element.description) ?? '').split('\n');
	const description = s.length > 1 ? `${s[0]} ${hyperlink('(more...)', hideLinkEmbed(element.url ?? ''))}` : s[0];

	return `${parts.join('')}\n${description}`;
}

function buildSelectOption(result: DocElement, dev = false) {
	return {
		label: result.formattedName,
		value: result.formattedName,
		description: truncate(stripMd(result.description ?? 'No description found'), 95),
		emoji: {
			id: docTypeEmojiId(result.docType, dev),
		},
	};
}

export function fetchDocResult(
	source: SourcesStringUnion,
	doc: Doc,
	query: string,
	user?: string,
	target?: string,
): string | null {
	const element = doc.get(...query.split(/\.|#/));
	if (!element) return null;
	const icon = formatEmoji(docTypeEmojiId(element.docType, source === 'main'));
	return suggestionString('documentation', `${icon} ${resolveElementString(element, doc)}`, user, target);
}

export function djsDocs(
	res: Response,
	doc: Doc,
	source: SourcesStringUnion,
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
			`${formatEmoji(
				source === 'main' ? EMOJI_ID_DJS_DEV : EMOJI_ID_DJS,
			)} No match. Select a similar search result to send it:`,
			results.map((r) => buildSelectOption(r, source === 'main')),
			4,
			`docsearch|${target ?? ''}|${source}`,
			true,
		);
		return res;
	}

	prepareErrorResponse(res, 'Nothing found with provided parameters.');
	return res;
}
