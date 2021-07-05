import { Response } from 'polka';
import Doc from 'discord.js-docs';
import { prepareErrorResponse, prepareResponse } from '../util/respond';
import { EMOJI_DJS, EMOJI_DJS_DEV, PREFIX_FAIL } from '../util/constants';

function escapeMDLinks(s = ''): string {
	return s.replace(/\[(.+?)\]\((.+?)\)/g, '[$1](<$2>)');
}

function formatInheritance(prefix: string, inherits: DocElement[], doc: Doc): string {
	const res = inherits.map((element: any) => element.flat(5));
	return ` (${prefix} ${res.map((element) => escapeMDLinks(doc.formatType(element))).join(' and ')})`;
}

function resolveElementString(element: DocElement, doc: Doc): string {
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

function resolveResultString(results: DocElement[]): string {
	const res = [
		`${PREFIX_FAIL} No match. Here are some search results:`,
		...results.map((res) => `• **${escapeMDLinks(res.link ?? '')}**`),
	];
	return res.join('\n');
}

export async function djsDocs(res: Response, source: string, query: string, target?: string): Promise<Response> {
	const doc = await Doc.fetch(source, { force: true });
	const element = doc.get(...query.split(/\.|#/));
	const icon = source === 'master' ? EMOJI_DJS_DEV : EMOJI_DJS;

	if (element) {
		prepareResponse(
			res,
			`${target ? `*Documentation suggestion for <@${target}>:*\n` : ''}${icon} ${resolveElementString(element, doc)}`,
			false,
			target ? [target] : [],
		);
		return res;
	}

	const results = doc.search(query);
	if (results?.length) {
		prepareResponse(res, resolveResultString(results), true);
		return res;
	}

	prepareErrorResponse(res, `Nothing found with provided parameters.`);
	return res;
}
