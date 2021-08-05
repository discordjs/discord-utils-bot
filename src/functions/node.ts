import { Response } from 'polka';
import fetch from 'node-fetch';
import { logger } from '../util/logger';
import TurndownService from 'turndown';
import { prepareErrorResponse, prepareResponse } from '../util/respond';
import { API_BASE_NODE, API_DOCS_NODE, EMOJI_ID_NODE } from '../util/constants';
import { formatEmoji } from '../util';

const td = new TurndownService({ codeBlockStyle: 'fenced' });

type QueryType = 'class' | 'classMethod' | 'method' | 'event' | 'module' | 'global' | 'misc';

function urlReplacer(_: string, label: string, link: string) {
	link = link.startsWith('http') ? link : `${API_BASE_NODE}/api/${link}`;
	return `[${label}](<${link}>)`;
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

let data: any = null;

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

export async function nodeSearch(res: Response, query: string, target?: string): Promise<Response> {
	query = query.trim();
	try {
		if (!data) {
			data = await fetch(`${API_DOCS_NODE}/all.json`).then((r) => r.json());
		}

		const queryParts = query.split(/#|\.|\s/);
		const altQuery = queryParts[queryParts.length - 1];
		const result = findResult(data, query) ?? findResult(data, altQuery);

		if (!result) {
			prepareErrorResponse(res, `No result found for query \`${query}\`.`);
			return res;
		}

		const moduleName = result.module ?? result.name.toLowerCase();
		const moduleURL = `${API_BASE_NODE}/api/${
			parseNameFromSource(result.source ?? result._source) ?? formatForURL(moduleName as string)
		}`;
		const anchor = ['module', 'misc'].includes(result.type) ? '' : formatAnchor(result.textRaw, moduleName as string);
		const fullURL = `${moduleURL}.html${anchor}`;
		const parts = [`${formatEmoji(EMOJI_ID_NODE)} \ __[**${result.textRaw as string}**](<${fullURL}>)__`];

		const intro = td.turndown(result.desc ?? '').split('\n\n')[0];
		const linkReplaceRegex = /\[(.+?)\]\((.+?)\)/g;
		const boldCodeBlockRegex = /`\*\*(.*)\*\*`/g;

		parts.push(intro.replace(linkReplaceRegex, urlReplacer).replace(boldCodeBlockRegex, '**`$1`**'));
		prepareResponse(
			res,
			`${target ? `*Documentation suggestion for <@${target}>:*\n` : ''}${parts.join('\n')}`,
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
