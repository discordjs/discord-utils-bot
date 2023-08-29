import { bold, hideLinkEmbed, hyperlink, underscore } from '@discordjs/builders';
import type { Doc, DocElement } from 'discordjs-docs-parser';
import { DocTypes } from 'discordjs-docs-parser';
import type { Response } from 'polka';
import type { CustomSourcesStringUnion } from '../types/discordjs-docs-parser';
import {
	EMOJI_ID_INTERFACE_DEV,
	EMOJI_ID_INTERFACE,
	EMOJI_ID_FIELD_DEV,
	EMOJI_ID_FIELD,
	EMOJI_ID_CLASS_DEV,
	EMOJI_ID_CLASS,
	EMOJI_ID_METHOD_DEV,
	EMOJI_ID_METHOD,
	EMOJI_ID_EVENT_DEV,
	EMOJI_ID_EVENT,
	EMOJI_ID_DJS_DEV,
	EMOJI_ID_DJS,
} from '../util/constants.js';
import { prepareResponse, prepareErrorResponse } from '../util/respond.js';
import { suggestionString } from '../util/suggestionString.js';

function docTypeEmojiId(docType: DocTypes | null, dev = false): string {
	switch (docType) {
		case DocTypes.Typedef:
			return dev ? EMOJI_ID_INTERFACE_DEV : EMOJI_ID_INTERFACE;
		case DocTypes.Prop:
			return dev ? EMOJI_ID_FIELD_DEV : EMOJI_ID_FIELD;
		case DocTypes.Class:
			return dev ? EMOJI_ID_CLASS_DEV : EMOJI_ID_CLASS;
		case DocTypes.Method:
		case DocTypes.Function:
			return dev ? EMOJI_ID_METHOD_DEV : EMOJI_ID_METHOD;
		case DocTypes.Event:
			return dev ? EMOJI_ID_EVENT_DEV : EMOJI_ID_EVENT;
		default:
			return dev ? EMOJI_ID_DJS_DEV : EMOJI_ID_DJS;
	}
}

function docTypeEmojiName(docType: DocTypes | null, dev = false): string {
	switch (docType) {
		case DocTypes.Typedef:
			return 'interface';
		case DocTypes.Prop:
			return 'property';
		case DocTypes.Class:
			return 'class';
		case DocTypes.Method:
		case DocTypes.Function:
			return 'method';
		case DocTypes.Event:
			return 'event';
		default:
			return dev ? 'djsatdev' : 'discordjs';
	}
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
	if (element.access === 'private') parts.push(` ${bold('PRIVATE')}`);
	if (element.deprecated) parts.push(` ${bold('DEPRECATED')}`);

	const elementString = ((element.formattedDescription || element.description) ?? '').split('\n');
	const description =
		elementString.length > 1
			? `${elementString[0]} ${hyperlink('(more...)', hideLinkEmbed(element.url ?? ''))}`
			: elementString[0];

	return `${parts.join('')}\n${description}`;
}

export function fetchDocResult(
	source: CustomSourcesStringUnion,
	doc: Doc,
	query: string,
	target?: string,
): string | null {
	const element = doc.get(...query.split(/\.|#/));
	if (!element) return null;
	const isMain = source === 'main';
	const icon = `<:${docTypeEmojiName(element.docType, isMain)}:${docTypeEmojiId(element.docType, isMain)}>`;
	return suggestionString('documentation', `${icon} ${resolveElementString(element, doc)}`, target);
}

export function djsDocs(
	res: Response,
	doc: Doc,
	source: CustomSourcesStringUnion,
	query: string,
	target?: string,
	ephemeral?: boolean,
): Response {
	const trimmedQuery = query.trim();

	const singleResult = fetchDocResult(source, doc, trimmedQuery, target);
	if (singleResult) {
		prepareResponse(res, singleResult, ephemeral ?? false, target ? [target] : [], [], 4);
		return res;
	}

	prepareErrorResponse(res, 'Nothing found with provided parameters.');
	return res;
}
