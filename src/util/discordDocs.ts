import { hyperlink, inlineCode, quote } from '@discordjs/builders';
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
	'---', // page meta delimiter + horizontal rule
	'|', // tables
	'!', // imports
	'import', // imports
	'require', // imports
	'/', // comments
	'<', // HTML, Components
];

export enum SectionPartType {
	Text = 1,
	Admonition,
	Table,
	Code,
	Preamble,
	Quote,
	Route,
	Image,
}

export enum AdmonitionType {
	Note = 1,
	Tip,
	Important,
	Warning,
	Caution,
}

type SectionPart =
	| {
			admonitionType: AdmonitionType;
			lines: string[];
			type: SectionPartType.Admonition;
	  }
	| {
			alt?: string;
			type: SectionPartType.Image;
			url: string;
	  }
	| {
			language?: string;
			lines: string[];
			type: SectionPartType.Code;
	  }
	| {
			lines: string[];
			type: SectionPartType.Preamble | SectionPartType.Quote | SectionPartType.Table | SectionPartType.Text;
	  }
	| {
			path: string;
			type: SectionPartType.Route;
			verb: string;
	  };

type Section = {
	headline: string;
	linkAnchor?: string;
	parts: SectionPart[];
};

function resolveAdmonitionType(text: string) {
	switch (text.toLowerCase()) {
		case 'note':
		case 'info':
			return AdmonitionType.Note;
		case 'tip':
			return AdmonitionType.Tip;
		case 'important':
			return AdmonitionType.Important;
		case 'warning':
		case 'warn':
			return AdmonitionType.Warning;
		case 'caution':
		case 'danger':
			return AdmonitionType.Caution;
	}

	return AdmonitionType.Note;
}

const ADMONITION_TYPES = ['Danger', 'Warning', 'Info'];

export function parseGithubStyleAdmonitionPrefix(text: string) {
	const label = /^> \[!(?<label>.*?)]/.exec(text)?.groups?.label;
	if (label) {
		return resolveAdmonitionType(label);
	}
}

export function parseGithubDocsSections(inLines: string[]) {
	const sections: Section[] = [];
	let parts: SectionPart[] = [];

	let headline = '';
	let headlineAnchor: string | undefined;

	let withinPreamble = false;
	let withinComponent = false;
	let withinTable = false;
	let withinQuote = false;
	let withinCodeBlock = false;
	let codeLang = '';
	let docsAdmonitionType: AdmonitionType | undefined;
	let githubAdmonitionType: AdmonitionType | undefined;

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
			const titleName = line.replace('title: ', '').replaceAll('*', '');
			headline = titleName;
		}

		// Admonitions
		const isAdmonitionDelimiter = ADMONITION_TYPES.some((admonition) => {
			return line.startsWith(`<${admonition}`) || line.startsWith(`</${admonition}`);
		});

		if (isAdmonitionDelimiter) {
			if (docsAdmonitionType) {
				parts.push({
					lines,
					type: SectionPartType.Admonition,
					admonitionType: docsAdmonitionType,
				});
				docsAdmonitionType = undefined;
				lines = [];
			} else {
				const parsedType = /<\/(?<label>.*?)>/.exec(line)?.groups?.label;
				flushToText();
				docsAdmonitionType = parsedType ? resolveAdmonitionType(parsedType.toLowerCase()) : AdmonitionType.Note;
			}

			continue;
		}

		// GitHub-style quote-admonitions
		if (line.startsWith('> [!')) {
			flushToText();
			githubAdmonitionType = parseGithubStyleAdmonitionPrefix(line);
			continue;
		}

		if (!line.startsWith('>') && githubAdmonitionType) {
			parts.push({
				lines,
				type: SectionPartType.Admonition,
				admonitionType: githubAdmonitionType,
			});
			lines = [];
			githubAdmonitionType = undefined;
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
			if (!withinCodeBlock && !githubAdmonitionType) {
				if (!withinQuote) {
					flushToText();
				}

				withinQuote = true;
			}
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

		// Images
		const imageMatch = /!\[(?<label>.*)]\((?<url>.*)\)/.exec(line);
		if (imageMatch?.groups?.url) {
			parts.push({
				type: SectionPartType.Image,
				url: imageMatch.groups.url,
				alt: imageMatch.groups.label,
			});
			continue;
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
			// ignore TSX components
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
					linkAnchor: headlineAnchor,
					headline,
					parts,
				});

				parts = [];
			}

			const anchorMatch = /\[(?<label>.*)]\((?<link>.*)\)/.exec(line.trim());
			if (anchorMatch?.groups?.link) {
				headlineAnchor = anchorMatch.groups.link;
			}

			// set headline
			headline = cleanedLine.replace(/^#+ ?/, '').replaceAll(/[()]/g, '').replace(/^\*+/, '').replace(/\*+$/, '');

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
				const trimmed = cleanedLine.trim();
				const quoteTrimmed = trimmed.startsWith('>') ? trimmed.slice(1).trim() : trimmed;

				if (quoteTrimmed.length > 0) {
					lines.push(quoteTrimmed);
				}
			}
		}
	}

	if (lines.length) {
		const firstLine = lines.at(0);
		if (firstLine) {
			if (firstLine?.startsWith('> [!')) {
				const admonitionType = parseGithubStyleAdmonitionPrefix(firstLine);
				if (admonitionType)
					parts.push({
						lines,
						type: SectionPartType.Admonition,
						admonitionType,
					});
			} else if (firstLine?.startsWith('>')) {
				parts.push({ lines, type: SectionPartType.Quote });
			} else if (firstLine?.startsWith('|')) {
				parts.push({ lines, type: SectionPartType.Table });
			} else {
				flushToText();
			}
		}
	}

	if (parts.length) {
		sections.push({ headline, parts, linkAnchor: headlineAnchor });
	}

	return sections;
}

export function sectionPartToText(part: SectionPart) {
	if (part.type === SectionPartType.Quote) {
		return part.lines.map((line) => quote(line)).join('\n');
	}

	if (part.type === SectionPartType.Route) {
		return `<:route:${EMOJI_ID_ROUTE}> ${inlineCode(part.verb)} ${part.path}`;
	}

	if (part.type === SectionPartType.Admonition) {
		const prefixed = part.lines.map((line) => quote(line));
		return prefixed.join('\n');
	}

	if (part.type === SectionPartType.Code) {
		return `\`\`\`${part.language ?? ''}\n${part.lines.join('\n')}\`\`\``;
	}

	if ('lines' in part) {
		return part.lines.join('\n');
	}

	return '';
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

export function findRelevantDocsSectionFuzzy(sections: Section[], query: string, defaultFirst = false) {
	const lowerQuery = query.trim().toLowerCase();
	const headingMatches = [];
	const contentMatches = [];
	const sectionsWithContent = [];

	if (lowerQuery.length > 0) {
		for (const section of sections) {
			const headline = section.headline.trim().toLowerCase().replace(/^#+/, '');
			const sectionHasContent = section.parts.some(
				(part) => part.type !== SectionPartType.Preamble && part.type !== SectionPartType.Table,
			);

			if (!sectionHasContent) {
				continue;
			}

			sectionsWithContent.push(section);

			if (lowerQuery === headline) return section;

			if (headline.includes(lowerQuery)) {
				headingMatches.push(section);
			}

			for (const part of section.parts) {
				const content = sectionPartToText(part);
				if (content.includes(lowerQuery)) {
					contentMatches.push(section);
				}
			}
		}
	}

	const otherMatches = [...headingMatches, ...contentMatches];

	if (otherMatches.length > 0) {
		return otherMatches[0];
	}

	if (defaultFirst && sections.length > 0) {
		return sectionsWithContent[0] ?? sections[0];
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
