import { readFileSync } from 'fs';
import { join } from 'path';
import * as TOML from '@ltd/j-toml';
import { Tag } from '../functions/tag';
import { red, green, yellow } from 'kleur';
import { AUTOCOMPLETE_MAX_ITEMS } from '../util';
import { request } from 'undici';

enum ConflictType {
	UniqueKeywords,
	HeaderInKeywords,
	NonEmptyKeyword,
	NonEmptyBody,
	EscapeLinks,
	NoWhiteSpace,
	Status404Link,
}

interface Conflict {
	firstName: string;
	secondName: string;
	conflictKeyWords: string[];
	type: ConflictType;
}

interface Warning {
	name: string;
	description: string;
}

function printWarnings(warnings: Warning[]) {
	process.stdout.write('\n\n');
	process.stdout.write('Tag validation warnings:\n');
	process.stdout.write(warnings.map((w, i) => yellow(`${i}. ${w.name}: ${w.description}`)).join('\n'));
	process.stdout.write('\n');
}

export async function validateTags(runResponseValidation: boolean) {
	const file = readFileSync(join(__dirname, '..', '..', 'tags', 'tags.toml'));
	const data = TOML.parse(file, 1.0, '\n');
	const conflicts: Conflict[] = [];
	const warnings: Warning[] = [];

	let hoisted = 0;
	for (const [key, value] of Object.entries(data)) {
		const v = value as unknown as Tag;
		const codeBlockRegex = /(`{1,3}).+?\1/gs;
		const markDownLinkRegex = /\[[^\[\]]+?\]\((?<startbracket><)?(?<link>[^\(\)]+?)(?<endbracket>>)?\)/g;
		const cleanedContent = v.content.replace(codeBlockRegex, '');

		const unescapedLinks: string[] = [];
		const invalidLinks: string[] = [];

		let result: RegExpExecArray | null;
		while ((result = markDownLinkRegex.exec(cleanedContent)) !== null) {
			const groups = result.groups;

			if (groups?.link) {
				if (!(groups.startbracket && groups.endbracket)) {
					unescapedLinks.push(result[0]);
				}

				if (runResponseValidation) {
					process.stdout.write(`\n[ ] Testing link: ${groups.link}`);
					const res = await request(groups.link, {
						maxRedirections: 1,
						headers: {
							'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:101.0) Gecko/20100101 Firefox/101.0',
						},
					}).catch(() => null);
					process.stdout.write('\r\x1b[K');
					if (!res || res.statusCode === 404) {
						invalidLinks.push(`${groups.link} (${res?.statusCode ?? 'request failed'})`);
						process.stdout.write(`[${red('✖')}] ${groups.link} (${red(res?.statusCode ?? 'request failed')})`);
					} else if (res.statusCode === 200) {
						process.stdout.write(`[${green('✔')}] ${groups.link} (${green(res.statusCode)})`);
					} else {
						warnings.push({
							name: key,
							description: `Non-200 statuscode response on: ${groups.link} (${res.statusCode})`,
						});
						process.stdout.write(`[${yellow('✔')}] ${groups.link} (${yellow(res.statusCode)})`);
					}
				}
			}
		}
		if (unescapedLinks.length) {
			conflicts.push({
				firstName: key,
				secondName: '',
				conflictKeyWords: unescapedLinks,
				type: ConflictType.EscapeLinks,
			});
		}

		if (invalidLinks.length) {
			conflicts.push({
				firstName: key,
				secondName: '',
				conflictKeyWords: invalidLinks,
				type: ConflictType.Status404Link,
			});
		}

		if (v.hoisted) {
			hoisted++;
		}

		if (!v.keywords.includes(key)) {
			conflicts.push({
				firstName: key,
				secondName: '',
				conflictKeyWords: [],
				type: ConflictType.HeaderInKeywords,
			});
		}

		if (v.keywords.some((k) => !k.replace(/\s+/g, '').length)) {
			conflicts.push({
				firstName: key,
				secondName: '',
				conflictKeyWords: [],
				type: ConflictType.NonEmptyKeyword,
			});
		}

		if (!v.content.replace(/[\s\r\n]+/g, '').length) {
			conflicts.push({
				firstName: key,
				secondName: '',
				conflictKeyWords: [],
				type: ConflictType.NonEmptyBody,
			});
		}

		const whiteSpaceKeywords = v.keywords.filter((k) => /\s/.exec(k));
		if (whiteSpaceKeywords.length) {
			conflicts.push({
				firstName: key,
				secondName: '',
				conflictKeyWords: whiteSpaceKeywords,
				type: ConflictType.NoWhiteSpace,
			});
		}

		for (const [otherKey, otherValue] of Object.entries(data)) {
			const oV = otherValue as unknown as Tag;
			if (key !== otherKey) {
				const conflictKeyWords = v.keywords.filter((k) => oV.keywords.includes(k));
				if (
					conflictKeyWords.length &&
					!conflicts.some((c) => [c.firstName, c.secondName].every((e) => [key, otherKey].includes(e)))
				) {
					conflicts.push({
						firstName: key,
						secondName: otherKey,
						conflictKeyWords,
						type: ConflictType.UniqueKeywords,
					});
				}
			}
		}
	}

	if (conflicts.length || hoisted > AUTOCOMPLETE_MAX_ITEMS) {
		const parts = [];
		const {
			uniqueConflicts,
			headerConflicts,
			emptyKeywordConflicts,
			emptyBodyConflicts,
			unescapedMarkdownLinkConflicts,
			noWhiteSpaceConflicts,
			status404LinkConflicts,
		} = conflicts.reduce(
			(a, c) => {
				switch (c.type) {
					case ConflictType.UniqueKeywords:
						a.uniqueConflicts.push(c);
						break;
					case ConflictType.HeaderInKeywords:
						a.headerConflicts.push(c);
						break;
					case ConflictType.NonEmptyKeyword:
						a.emptyKeywordConflicts.push(c);
						break;
					case ConflictType.NonEmptyBody:
						a.emptyBodyConflicts.push(c);
						break;
					case ConflictType.EscapeLinks:
						a.unescapedMarkdownLinkConflicts.push(c);
						break;
					case ConflictType.NoWhiteSpace:
						a.noWhiteSpaceConflicts.push(c);
						break;
					case ConflictType.Status404Link:
						a.status404LinkConflicts.push(c);
				}
				return a;
			},
			{
				uniqueConflicts: [] as Conflict[],
				headerConflicts: [] as Conflict[],
				emptyKeywordConflicts: [] as Conflict[],
				emptyBodyConflicts: [] as Conflict[],
				noWhiteSpaceConflicts: [] as Conflict[],
				unescapedMarkdownLinkConflicts: [] as Conflict[],
				status404LinkConflicts: [] as Conflict[],
			},
		);

		if (uniqueConflicts.length) {
			parts.push(
				`Tag validation error: Keywords have to be unique:\n${uniqueConflicts
					.map((c, i) => red(`${i}. [${c.firstName}] <> [${c.secondName}]: keywords: ${c.conflictKeyWords.join(', ')}`))
					.join('\n')}`,
			);
		}
		if (headerConflicts.length) {
			parts.push(
				`Tag validation error: Tag header must be part of keywords:\n${headerConflicts
					.map((c, i) => red(`${i}. [${c.firstName}]`))
					.join('\n')}`,
			);
		}

		if (emptyBodyConflicts.length) {
			parts.push(
				`Tag validation error: Tag body cannot be empty:\n${emptyBodyConflicts
					.map((c, i) => red(`${i}. [${c.firstName}]`))
					.join('\n')}`,
			);
		}

		if (emptyKeywordConflicts.length) {
			parts.push(
				`Tag validation error: Tag keywords cannot be empty:\n${emptyKeywordConflicts
					.map((c, i) => red(`${i}. [${c.firstName}]`))
					.join('\n')}`,
			);
		}

		if (noWhiteSpaceConflicts.length) {
			parts.push(
				`Tag validation error: Tag names and keywords cannot include whitespace (use - instead):\n${noWhiteSpaceConflicts
					.map((c, i) => red(`${i}. tag: ${c.firstName}: ${c.conflictKeyWords.join(', ')}`))
					.join('\n')}`,
			);
		}

		if (unescapedMarkdownLinkConflicts.length) {
			parts.push(
				`Tag validation error: Masked links need to be escaped as [label](<link>):\n${unescapedMarkdownLinkConflicts
					.map((c, i) => red(`${i}. tag: ${c.firstName}: ${c.conflictKeyWords.join(', ')}`))
					.join('\n')}`,
			);
		}

		if (status404LinkConflicts.length) {
			parts.push(
				`Tag validation error: Links returned a 404 status code:\n${status404LinkConflicts
					.map((c, i) => red(`${i}. tag: ${c.firstName}: ${c.conflictKeyWords.join(', ')}`))
					.join('\n')}`,
			);
		}

		if (hoisted > AUTOCOMPLETE_MAX_ITEMS) {
			parts.push(`Amount of hoisted tags exceeds ${AUTOCOMPLETE_MAX_ITEMS} (is ${hoisted})`);
		}

		process.stderr.write('\n');
		process.stderr.write(parts.join('\n\n'));
		process.stderr.write('\n');

		if (warnings.length) {
			printWarnings(warnings);
		}

		process.stderr.write(red('\n\nTag validation failed\n\n'));
		process.exit(1);
	}

	if (warnings.length) {
		printWarnings(warnings);
	}
	process.stdout.write(green(`\n\nTag validation passed with ${warnings.length} warnings 🎉\n\n`));
	process.exit(0);
}
