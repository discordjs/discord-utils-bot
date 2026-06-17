import { hyperlink, inlineCode } from '@discordjs/builders';
import { DISCORD_DOCS_BASE, EMOJI_ID_ROUTE } from './constants.js';
import { logger } from './logger.js';

export function resolveResourceFromDocsURL(path: string) {
	const [base, anchor] = path.split('#');
	const githubUrl = `https://raw.githubusercontent.com/discord/discord-api-docs/main/${base}.mdx`;

	logger.debug({ path, base, anchor, githubUrl }, 'Docs url resolver debug');

	return {
		docsAnchor: anchor,
		githubUrl,
	};
}

function cleanLine(line: string) {
	return line
		.replaceAll(/\[(.*?)]\(.*?\)/g, '$1')
		.replaceAll(/{(.*?)#.*?}/g, '$1')
		.trim();
}

const IGNORE_LINE_PREFIXES = [
	'>', // quotes
	'---', // page meta delimiter + horizontal rule
	'|', // tables
	'!', // imports
	'import', // imports
	'require', // imports
	'/', // comments
	'<', // HTML, Components
];

export enum SectionPartType {
	Text = 0,
	Admonition,
	Table,
	Code,
	Preamble,
	Quote,
	Route,
}

type SectionPart =
	| {
			language?: string;
			lines: string[];
			type: SectionPartType.Code;
	  }
	| {
			lines: string[];
			type:
				| SectionPartType.Admonition
				| SectionPartType.Preamble
				| SectionPartType.Quote
				| SectionPartType.Table
				| SectionPartType.Text;
	  }
	| {
			path: string;
			type: SectionPartType.Route;
			verb: string;
	  };

type Section = {
	headline: string;
	parts: SectionPart[];
};

const ADMONITION_TYPES = ['Danger', 'Warning', 'Info'];

export function parseGithubDocsSections(inLines: string[]) {
	const sections: Section[] = [];
	let parts: SectionPart[] = [];

	let headline = '';

	let withinPreamble = false;
	let withinAdmonition = false;
	let withinComponent = false;
	let withinTable = false;
	let withinQuote = false;
	let withinCodeBlock = false;
	let codeLang = '';

	let lines: string[] = [];
	const flushToText = () => {
		if (lines.length > 0) {
			parts.push({
				lines,
				type: SectionPartType.Text,
			});
			lines = [];
		}
	};

	let index = -1;
	for (const line of inLines) {
		index++;
		const cleanedLine = cleanLine(line);

		// Preamble
		if (line.startsWith('---')) {
			if (index === 0) {
				withinPreamble = true;
				continue;
			}

			if (withinPreamble) {
				parts.push({
					lines,
					type: SectionPartType.Preamble,
				});

				lines = [];

				withinPreamble = false;
				continue;
			}
		}

		if (withinPreamble && line.startsWith('title:')) {
			// manually assign title based on page meta
			const titleName = line.replace('title: ', '');
			headline = titleName;
		}

		// Admonitions
		const isAdmonitionDelimiter = ADMONITION_TYPES.some((admonition) => {
			return line.startsWith(`<${admonition}`) || line.startsWith(`</${admonition}`);
		});

		if (isAdmonitionDelimiter) {
			if (withinAdmonition) {
				parts.push({ lines, type: SectionPartType.Admonition });
				lines = [];
			} else {
				flushToText();
			}

			withinAdmonition = !withinAdmonition;
			continue;
		}

		// Code
		if (line.startsWith('```')) {
			if (withinCodeBlock) {
				parts.push({ lines, type: SectionPartType.Code, language: codeLang });
				lines = [];
			} else {
				codeLang = line.slice(3);
				flushToText();
			}

			withinCodeBlock = !withinCodeBlock;
			continue;
		}

		// Quotes
		if (line.startsWith('>')) {
			withinQuote = true;
			flushToText();
		} else if (withinQuote) {
			parts.push({ lines, type: SectionPartType.Quote });
			lines = [];

			withinQuote = false;
		}

		// Tables
		if (line.startsWith('|')) {
			withinTable = true;
			flushToText();
		} else if (withinTable) {
			parts.push({ lines, type: SectionPartType.Table });
			lines = [];

			withinTable = false;
		}

		// Route
		if (line.startsWith('<Route')) {
			const match = /<Route method="(?<verb>\w{3,6})">\/(?<path>.*)<\/Route>/.exec(line);

			if (match?.groups) {
				const replaced = match.groups.path.replaceAll(/\[\\{(?<label>.*?)\\}]\((?<url>.*?)\)/g, (_, ...args) => {
					const groups = args[4];
					return hyperlink(`{${groups.label}}`, `${DISCORD_DOCS_BASE}${groups.url}`);
				});

				parts.push({
					type: SectionPartType.Route,
					verb: match.groups.verb!,
					path: replaced,
				});

				lines = [];
			}

			continue;
		}

		// Other TSX components
		if (line.startsWith('<') && !withinCodeBlock) {
			withinComponent = true;
		}

		const samelineClose = line.trim().endsWith('/>');
		if ((line.startsWith('</') || samelineClose) && withinComponent) {
			withinComponent = false;
		}

		if (withinComponent) {
			continue;
		}

		// Headings
		if (line.startsWith('#')) {
			if (headline.length > 0) {
				if (lines.length > 0) {
					// still have some lines in buffer
					flushToText();
				}

				// already have title, new section
				sections.push({
					headline,
					parts,
				});

				parts = [];
			}

			// set headline
			headline = cleanedLine.replace(/^#+ ?/, '').replaceAll(/[()]/g, '');

			continue;
		}

		const startsWithIgnorePrefix = IGNORE_LINE_PREFIXES.some((prefix) => line.trim().startsWith(prefix));

		if (startsWithIgnorePrefix) {
			continue;
		}

		// Add line
		if (line.length) {
			if (withinCodeBlock) {
				lines.push(line);
			} else {
				lines.push(cleanedLine);
			}
		}
	}

	if (lines.length) {
		const firstLine = lines.at(0);
		if (firstLine?.startsWith('>')) {
			parts.push({ lines, type: SectionPartType.Quote });
		}

		if (firstLine?.startsWith('|')) {
			parts.push({ lines, type: SectionPartType.Table });
		}

		flushToText();
	}

	if (parts.length) {
		sections.push({ headline, parts });
	}

	return sections;
}

export function sectionPartToText(part: SectionPart) {
	if (part.type === SectionPartType.Route) {
		return `<:route:${EMOJI_ID_ROUTE}> ${inlineCode(part.verb)} ${part.path}`;
	}

	if (part.type === SectionPartType.Admonition) {
		const prefixed = part.lines.map((line) => `> ${line}`);
		return prefixed.join('\n');
	}

	if (part.type === SectionPartType.Code) {
		return `\`\`\`${part.language ?? ''}\n${part.lines.join('\n')}\`\`\``;
	}

	return part.lines.join('\n');
}

function formatAnchor(text: string) {
	return text
		.toLowerCase()
		.replaceAll(' ', '-')
		.replaceAll(/[!'.:?]/gi, '');
}

export function findRelevantDocsSection(sections: Section[], query: string, defaultFirst = false) {
	for (const section of sections) {
		const anchor = formatAnchor(section.headline);

		if (anchor === query) {
			return section;
		}
	}

	if (defaultFirst && sections.length > 0) {
		return sections[0];
	}
}

export async function fetchDocsBody(link: string) {
	const githubResource = resolveResourceFromDocsURL(link);
	if (!githubResource) {
		logger.debug({ link, githubResource }, 'No github resource found');
		return null;
	}

	const docsMd = await fetch(githubResource.githubUrl).then(async (res) => {
		if (res.status === 404) {
			return fetch(githubResource.githubUrl.slice(0, -1)).then(async (innerRes) => innerRes.text());
		}

		return res.text();
	});

	const parsedSections = parseGithubDocsSections(docsMd.split(/\n+/));
	const section = findRelevantDocsSection(parsedSections, githubResource.docsAnchor, true);

	if (section) {
		return section;
	}
}
