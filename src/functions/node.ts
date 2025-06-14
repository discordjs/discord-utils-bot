/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */

import { URL } from 'node:url';
import { bold, hideLinkEmbed, hyperlink, inlineCode, italic, underscore, userMention } from '@discordjs/builders';
import * as cheerio from 'cheerio';
import type { Response } from 'polka';
import TurndownService from 'turndown';
import { fetch } from 'undici';
import type { NodeDocs } from '../types/NodeDocs.js';
import { API_BASE_NODE, AUTOCOMPLETE_MAX_NAME_LENGTH, EMOJI_ID_NODE } from '../util/constants.js';
import { logger } from '../util/logger.js';
import { toTitlecase } from '../util/misc.js';
import { prepareErrorResponse, prepareResponse } from '../util/respond.js';
import { truncate } from '../util/truncate.js';
import { urlOption } from '../util/url.js';

const td = new TurndownService({ codeBlockStyle: 'fenced' });

type QueryType = 'class' | 'classMethod' | 'event' | 'global' | 'method' | 'misc' | 'module';

function urlReplacer(_: string, label: string, link: string, version: string) {
	const resolvedLink = link.startsWith('http') ? link : `${API_BASE_NODE}/docs/${version}/api/${link}`;
	return hyperlink(label, hideLinkEmbed(resolvedLink));
}

function findRec(object: any, name: string, type: QueryType, module?: string, source?: string): any {
	const lowerName = name.toLowerCase();
	const resolvedModule = object?.type === 'module' ? object?.name.toLowerCase() : module ?? undefined;
	object._source = source;
	if (object?.name?.toLowerCase() === lowerName && object?.type === type) {
		object.module = resolvedModule;
		return object;
	}

	for (const prop of Object.keys(object)) {
		if (Array.isArray(object[prop])) {
			for (const entry of object[prop]) {
				const res = findRec(entry, name, type, resolvedModule, object.source ?? object._source);
				if (res) {
					object.module = resolvedModule;
					return res;
				}
			}
		}
	}
}

function findResult(data: any, query: string) {
	for (const category of ['class', 'classMethod', 'method', 'event', 'module', 'global', 'misc'] as QueryType[]) {
		const res = findRec(data, query, category);
		if (res) {
			// eslint-disable-next-line @typescript-eslint/no-unsafe-return
			return res;
		}
	}
}

function formatAnchorText(anchorTextRaw: string) {
	return anchorTextRaw.replaceAll(/\W/g, (match) => (match === ' ' ? '-' : '')).toLowerCase();
}

function parsePageFromSource(source: string): string | null {
	const reg = /.+\/api\/(.+)\..*/g;
	const match = reg.exec(source);
	return match?.[1] ?? null;
}

function docsUrl(version: string, source: string, anchorTextRaw: string) {
	return `${API_BASE_NODE}/docs/${version}/api/${parsePageFromSource(source)}.html#${formatAnchorText(anchorTextRaw)}`;
}

const jsonCache: Map<string, NodeDocs> = new Map();
const docsCache: Map<string, string> = new Map();

export async function nodeAutoCompleteResolve(res: Response, query: string, user?: string, ephemeral?: boolean) {
	const url = urlOption(`${API_BASE_NODE}/${query}`);

	if (!url || !query.startsWith('docs')) {
		return nodeSearch(res, query, undefined, user, ephemeral);
	}

	const key = `${url.origin}${url.pathname}`;
	let html = docsCache.get(key);

	if (!html) {
		const data = await fetch(url.toString()).then(async (response) => response.text());
		docsCache.set(key, data);
		html = data;
	}

	const $ = cheerio.load(html);

	const possible = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'];

	const headingBaseSelectorParts = possible.map((prefix) => `${prefix}:has(${url.hash})`);
	const heaidngSelector = headingBaseSelectorParts.join(', ');
	const headingCodeSelector = headingBaseSelectorParts.map((part) => `${part} > code`).join(', ');
	const paragraphSelector = headingBaseSelectorParts.join(', ');

	const heading = $(heaidngSelector).text().replaceAll('#', '');
	const headingCode = $(headingCodeSelector).text();
	const paragraph = $(paragraphSelector).nextUntil('h4', 'p');

	const text = paragraph.text().split('\n').join(' ');
	const sentence = text.split(/[!.?](\s|$)/)?.[0];
	const effectiveSentence = (sentence ?? truncate(text, AUTOCOMPLETE_MAX_NAME_LENGTH, '')).trim();

	const contentParts = [
		`<:node:${EMOJI_ID_NODE}> ${hyperlink(inlineCode(headingCode.length ? headingCode : heading), url.toString())}`,
	];

	if (effectiveSentence.length) {
		contentParts.push(`${effectiveSentence}.`);
	}

	prepareResponse(res, contentParts.join('\n'), {
		ephemeral,
		suggestion: user ? { userId: user, kind: 'documentation' } : undefined,
	});

	return res;
}

function parsePathToPhrase(path: string) {
	const [head, tail] = path.split('#');
	const _headPart = head?.length ? head.replaceAll('-', ' ') : undefined;
	const headPart = _headPart?.split('/').at(-1);
	const tailPart = tail?.length ? tail.replaceAll('-', ' ') : undefined;

	const parts: string[] = [];
	if (headPart) {
		parts.push(toTitlecase(headPart));
	}

	if (tailPart) {
		parts.push(toTitlecase(tailPart));
	}

	return parts.join(' > ');
}

export async function nodeSearch(
	res: Response,
	query: string,
	version = 'latest-v20.x',
	user?: string,
	ephemeral?: boolean,
): Promise<Response> {
	const trimmedQuery = query.trim();
	try {
		const url = `${API_BASE_NODE}/dist/${version}/docs/api/all.json`;
		let allNodeData = jsonCache.get(url);

		if (!query.startsWith('docs')) {
			prepareResponse(
				res,
				`<:node:${EMOJI_ID_NODE}> ${bold('Learn more about Node.js:')}\n${hyperlink(parsePathToPhrase(trimmedQuery), `${API_BASE_NODE}/en/${trimmedQuery}`)}`,
				{
					ephemeral,
					suggestion: user ? { userId: user, kind: 'documentation' } : undefined,
				},
			);
			return res;
		}

		if (!allNodeData) {
			const data = (await fetch(url).then(async (response) => response.json())) as NodeDocs;
			jsonCache.set(url, data);
			allNodeData = data;
		}

		const queryParts = trimmedQuery.split(/[\s#.]/);
		const altQuery = queryParts[queryParts.length - 1];
		const result = findResult(allNodeData, trimmedQuery) ?? findResult(allNodeData, altQuery);

		if (!result) {
			prepareErrorResponse(res, `No result found for query ${inlineCode(trimmedQuery)}.`);
			return res;
		}

		const parts = [
			`<:node:${EMOJI_ID_NODE}> ${hyperlink(
				result.textRaw,
				docsUrl(version, result.source ?? result._source, result.textRaw),
			)}`,
		];

		const intro = td.turndown(result.desc ?? '').split('\n\n')[0];
		const linkReplaceRegex = /\[(.+?)]\((.+?)\)/g;
		const boldCodeBlockRegex = /`\*\*(.*)\*\*`/g;

		parts.push(
			intro
				.replaceAll(linkReplaceRegex, (_, label, link) => urlReplacer(_, label, link, version))
				.replaceAll(boldCodeBlockRegex, bold(inlineCode('$1'))),
		);

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
