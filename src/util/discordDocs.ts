import { urlOption } from './url.js';

export function toMdFilename(name: string) {
	return name
		.split('-')
		.map((part) => `${part.at(0)?.toUpperCase()}${part.slice(1).toLowerCase()}`)
		.join('');
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
	docs_anchor: string;
	label: string;
	route: string;
	verb: string;
};

function parseHeadline(text: string): Heading | null {
	const match = /#{1,7} (?<label>.*) % (?<verb>\w{3,6}) (?<route>.*)/g.exec(text);
	if (!match) {
		return null;
	}

	const { groups } = match;
	return {
		docs_anchor: `#${groups!.label.replaceAll(' ', '-').toLowerCase()}`,
		label: groups!.label,
		verb: groups!.verb,
		route: groups!.route,
	};
}

// https://raw.githubusercontent.com/discord/discord-api-docs/main/docs/resources/user/User.md
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

export function parseSections(content: string): ParsedSection[] {
	const res = [];
	const section: ParsedSection = {
		heading: null,
		lines: [],
		headline: '',
	};

	for (const line of content.split('\n')) {
		const cleanedLine = cleanLine(line);

		if (line.startsWith('>')) {
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

	return res;
}

export function findRelevantDocsSection(query: string, docsMd: string) {
	const sections = parseSections(docsMd);
	for (const section of sections) {
		if (section.heading?.docs_anchor === query) {
			return section;
		}
	}
}

export async function fetchDocsBody(link: string) {
	const githubResource = resolveResourceFromDocsURL(link);
	if (!githubResource) {
		return null;
	}

	const docsMd = await fetch(githubResource.githubUrl).then(async (res) => res.text());
	const section = findRelevantDocsSection(githubResource.docsAnchor, docsMd);

	if (section) {
		return section;
	}
}
