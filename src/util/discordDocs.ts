import { urlOption } from './url.js';

export function resolveResourceFromDocsURL(link: string) {
	const url = urlOption(link);
	if (!url) {
		return null;
	}

	const pathParts = url.pathname.split('/').slice(2);
	if (!pathParts.length) {
		return null;
	}

	const docsAnchor = url.hash;
	const githubUrl = `https://raw.githubusercontent.com/discord/discord-api-docs/main/${pathParts
		.slice(0, -1)
		.join('/')}/${pathParts.at(-1)!}.md`;

	return {
		docsAnchor,
		githubUrl,
	};
}

// https://raw.githubusercontent.com/discord/discord-api-docs/main/docs/resources/user.mdx

type Route = {
	path: string;
	verb: string;
};

type ParsedSection = {
	headline: string;
	lines: string[];
	route?: Route;
};

function cleanLine(line: string) {
	return line
		.replaceAll(/\[(.*?)]\(.*?\)/g, '$1')
		.replaceAll(/{(.*?)#.*?}/g, '$1')
		.trim();
}

function formatRoutePath(path: string) {
	return path.replaceAll(/\[(.*?)]\(.*?\)/g, '$1');
}

const IGNORE_LINE_PREFIXES = ['>', '---', '|', '!'];

export function parseSections(content: string): ParsedSection[] {
	const res = [];
	const section: ParsedSection = {
		lines: [],
		headline: '',
	};

	let withinPreamble = false;
	let withinAdmonition = false;
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
		}

		if (line.startsWith(':::')) {
			withinAdmonition = !withinAdmonition;
			continue;
		}

		if (withinAdmonition) {
			continue;
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
				section.headline = '';
			}

			section.headline = cleanedLine.replace(/^#+ ?/, '').replaceAll(/[()]/g, '');
			continue;
		}

		if (line.startsWith('<Route')) {
			const match = /<Route method="(?<verb>\w{3,6})">\/(?<path>.*)<\/Route>/.exec(line);

			if (match?.groups) {
				section.route = {
					verb: match.groups.verb!,
					path: formatRoutePath(match.groups.path!),
				};
			}

			continue;
		}

		if (cleanedLine.length) {
			section.lines.push(cleanedLine);
		}
	}

	if (section.headline?.length) {
		res.push({ ...section });
	}

	return res;
}

export function findRelevantDocsSection(query: string, docsMd: string) {
	const sections = parseSections(docsMd);

	for (const section of sections) {
		const anchor = `#${section.headline.toLowerCase().replaceAll(' ', '-').replaceAll(':', '')}`;

		if (anchor === query) {
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
