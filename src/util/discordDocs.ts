import { toTitlecase } from './misc.js';
import { urlOption } from './url.js';

export function toMdFilename(name: string) {
	return name
		.split('-')
		.map((part) => toTitlecase(part))
		.join('_');
}

export function resolveResourceFromDocsURL(link: string) {
	const url = urlOption(link);
	if (!url) {
		return null;
	}

	const pathParts = url.pathname.split('/').slice(2);
	if (!pathParts.length) {
		return null;
	}

	return {
		docsAnchor: url.hash,
		githubUrl: `https://raw.githubusercontent.com/discord/discord-api-docs/main/${pathParts
			.slice(0, -1)
			.join('/')}/${toMdFilename(pathParts.at(-1)!)}.md`,
	};
}

type Heading = {
	docs_anchor?: string;
	label: string;
	route?: string;
	verb?: string;
};

function parseHeadline(text: string): Heading | null {
	const match = /#{1,7} (?<label>.+) % (?<verb>\w{3,6}) (?<route>.*)|#{1,7} (?<onlylabel>.+)/g.exec(text);
	if (!match?.groups) {
		return null;
	}

	const { groups } = match;
	const label = groups.label ?? groups.onlylabel;

	return {
		docs_anchor: `#${label.replaceAll(' ', '-').replaceAll(':', '').toLowerCase()}`,
		label,
		verb: groups.verb,
		route: groups.route,
	};
}

// https://raw.githubusercontent.com/discord/discord-api-docs/main/docs/resources/User.md

type ParsedSection = {
	heading: Heading | null;
	headline: string;
	lines: string[];
};

function cleanLine(line: string) {
	return line
		.replaceAll(/\[(.*?)]\(.*?\)/g, '$1')
		.replaceAll(/{(.*?)#.*?}/g, '$1')
		.trim();
}

const IGNORE_LINE_PREFIXES = ['>', '---', '|', '!'];

export function parseSections(content: string): ParsedSection[] {
	const res = [];
	const section: ParsedSection = {
		heading: null,
		lines: [],
		headline: '',
	};

	let withinPreamble = false;
	let index = 0;
	for (const line of content.split('\n')) {
		const cleanedLine = cleanLine(line);

		if (line.startsWith('---')) {
			if (index === 0) {
				withinPreamble = true;
			} else if (withinPreamble) {
				withinPreamble = false;
			}
		}

		if (withinPreamble && line.startsWith('title:')) {
			const titleName = line.replace('title: ', '');
			section.headline = titleName;
			section.heading = { label: titleName };
		}

		index++;

		const startsWithIgnorePrefix = IGNORE_LINE_PREFIXES.some((prefix) => line.startsWith(prefix));
		if (withinPreamble || startsWithIgnorePrefix) {
			continue;
		}

		if (line.startsWith('#')) {
			if (section.headline.length) {
				res.push({ ...section });

				section.lines = [];
				section.heading = null;
				section.headline = '';
			}

			section.headline = cleanedLine;
			const parsedHeading = parseHeadline(cleanedLine);
			if (parsedHeading) {
				section.heading = parsedHeading;
			}

			continue;
		}

		if (cleanedLine.length) {
			section.lines.push(cleanedLine);
		}
	}

	if (section.heading) {
		res.push({ ...section });
	}

	return res;
}

function compressAnchor(anchor: string) {
	return anchor.replaceAll('-', '');
}

function anchorsCompressedEqual(one?: string, other?: string) {
	if (!one || !other) {
		return false;
	}

	const one_ = compressAnchor(one);
	const other_ = compressAnchor(other);

	return one_ === other_;
}

export function findRelevantDocsSection(query: string, docsMd: string) {
	const sections = parseSections(docsMd);
	for (const section of sections) {
		const anchor = section.heading?.docs_anchor ?? section.headline.toLowerCase();
		if (anchor.startsWith(query) || anchorsCompressedEqual(anchor, query)) {
			return section;
		}
	}
}

export async function fetchDocsBody(link: string) {
	const githubResource = resolveResourceFromDocsURL(link);
	if (!githubResource) {
		return null;
	}

	const docsMd = await fetch(githubResource.githubUrl).then(async (res) => {
		if (res.status === 404) {
			// some docs pages use the .mdx format
			return fetch(`${githubResource.githubUrl}x`).then(async (innerRes) => innerRes.text());
		}

		return res.text();
	});
	const section = findRelevantDocsSection(githubResource.docsAnchor, docsMd);

	if (section) {
		return section;
	}
}
