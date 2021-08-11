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
import TurndownService from 'turndown';
import type { NodeDocs } from '../types/NodeDocs';
import { API_BASE_NODE, API_DOCS_NODE, EMOJI_ID_NODE } from '../util/constants';
import { logger } from '../util/logger';
import { prepareErrorResponse, prepareResponse } from '../util/respond';

const td = new TurndownService({ codeBlockStyle: 'fenced' });

type QueryType = 'class' | 'classMethod' | 'method' | 'event' | 'module' | 'global' | 'misc';

function urlReplacer(_: string, label: string, link: string, version: string) {
	link = link.startsWith('http') ? link : `${API_BASE_NODE}/docs/${version}/api/${link}`;
	return hyperlink(label, hideLinkEmbed(link));
}

function findRec(o: any, name: string, type: QueryType, module?: string, source?: string): any {
	name = name.toLowerCase();
	if (!module) module = o?.type === 'module' ? o?.name.toLowerCase() : undefined;
	if (o?.name?.toLowerCase() === name && o?.type === type) {
		o.module = module;
		return o;
	}
	o._source = source;
	for (const prop of Object.keys(o)) {
		if (Array.isArray(o[prop])) {
			for (const entry of o[prop]) {
				const res = findRec(entry, name, type, module, o.source ?? o._source);
				if (res) {
					o.module = module;
					return res;
				}
			}
		}
	}
}

function formatForURL(text: string): string {
	return text
		.toLowerCase()
		.replace(/ |`|\[|\]|\)/g, '')
		.replace(/\.|\(|,|:/g, '_');
}

function formatAnchor(text: string, module: string): string {
	return `#${formatForURL(module)}_${formatForURL(text)}`;
}

function parseNameFromSource(source?: string): string | null {
	if (!source) return null;
	const reg = /.+\/api\/(.+)\..*/g;
	const match = reg.exec(source);
	return match?.[1] ?? null;
}

function findResult(data: any, query: string) {
	for (const category of ['class', 'classMethod', 'method', 'event', 'module', 'global', 'misc'] as QueryType[]) {
		const res = findRec(data, query, category);
		if (res) {
			return res;
		}
	}
}

const cache: Map<string, NodeDocs> = new Map();

export async function nodeSearch(
	res: Response,
	query: string,
	version = 'latest-v16.x',
	target?: string,
): Promise<Response> {
	query = query.trim();
	try {
		const url = `${API_DOCS_NODE}/dist/${version}/docs/api/all.json`;
		let allNodeData = cache.get(url);

		if (!allNodeData) {
			// Get the data for this version
			const data = (await fetch(url).then((r) => r.json())) as NodeDocs;

			// Set it to the map for caching
			cache.set(url, data);

			// Set the local parameter for further processing
			allNodeData = data;
		}

		const queryParts = query.split(/#|\.|\s/);
		const altQuery = queryParts[queryParts.length - 1];
		const result = findResult(allNodeData, query) ?? findResult(allNodeData, altQuery);

		if (!result) {
			prepareErrorResponse(res, `No result found for query ${inlineCode(query)}.`);
			return res;
		}

		const moduleName = result.module ?? result.name.toLowerCase();
		const moduleURL = `${API_BASE_NODE}/docs/${version}/api/${
			parseNameFromSource(result.source ?? result._source) ?? formatForURL(moduleName as string)
		}`;
		const anchor = ['module', 'misc'].includes(result.type) ? '' : formatAnchor(result.textRaw, moduleName as string);
		const fullURL = `${moduleURL}.html${anchor}`;
		const parts = [
			`${formatEmoji(EMOJI_ID_NODE) as string} \ ${hyperlink(
				underscore(bold(result.textRaw as string)),
				hideLinkEmbed(fullURL),
			)}`,
		];

		const intro = td.turndown(result.desc ?? '').split('\n\n')[0];
		const linkReplaceRegex = /\[(.+?)\]\((.+?)\)/g;
		const boldCodeBlockRegex = /`\*\*(.*)\*\*`/g;

		parts.push(
			intro
				.replace(linkReplaceRegex, (_, label, link) => urlReplacer(_, label, link, version))
				.replace(boldCodeBlockRegex, bold(inlineCode('$1'))),
		);
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
