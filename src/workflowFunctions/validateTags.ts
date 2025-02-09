import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import * as TOML from '@ltd/j-toml';
import kleur from 'kleur';
import { request } from 'undici';
import type { Tag } from '../functions/tag';
import { AUTOCOMPLETE_MAX_ITEMS } from '../util/constants.js';

enum ConflictType {
	UniqueKeywords,
	NonEmptyKeyword,
	NonEmptyBody,
	NoWhiteSpace,
	NameNotInKeywords,
	Status404Link,
	NameLowercase,
}

type Conflict = {
	conflictKeyWords: string[];
	firstName: string;
	secondName: string;
	type: ConflictType;
};

type Warning = {
	description: string;
	name: string;
};

function printWarnings(warnings: Warning[], stream: NodeJS.WriteStream) {
	stream.write('\n\n');
	stream.write('Tag validation warnings:\n');
	stream.write(
		warnings.map((warning, index) => kleur.yellow(`${index}. ${warning.name}: ${warning.description}`)).join('\n'),
	);
	stream.write('\n');
}

export function parseSingleTag(tag: string) {
	return TOML.parse(tag, 1, '\n');
}

type ValidationResult = {
	errors: string[];
	warnings: Warning[];
};

export async function validateTags(
	runResponseValidation: boolean,
	_additionalTagData?: string,
): Promise<ValidationResult> {
	const file = await readFile(join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'tags', 'tags.toml'));

	const mergedData = _additionalTagData ? `${file.toString()}\n\n${_additionalTagData}` : file;
	const data = TOML.parse(mergedData, 1, '\n');
	const conflicts: Conflict[] = [];
	const warnings: Warning[] = [];

	let hoisted = 0;
	for (const [key, value] of Object.entries(data)) {
		const tag = value as unknown as Tag;
		const codeBlockRegex = /(`{1,3}).+?\1/gs;
		const markDownLinkRegex = /\[[^[\]]+?]\(<?(?<link>[^()]+?)>?\)/g;
		const cleanedContent = tag.content.replaceAll(codeBlockRegex, '');

		const invalidLinks: string[] = [];

		if (runResponseValidation) {
			let result: RegExpExecArray | null;
			while ((result = markDownLinkRegex.exec(cleanedContent)) !== null) {
				const groups = result.groups;

				if (groups?.link) {
					process.stdout.write(`\n[ ] Testing link: ${groups.link}`);
					const res = await request(groups.link, {
						maxRedirections: 1,
						headers: {
							'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:101.0) Gecko/20100101 Firefox/101.0',
						},
					}).catch(() => null);
					process.stdout.write('\r\u001B[K');
					if (!res || res.statusCode === 404) {
						invalidLinks.push(`${groups.link} (${res?.statusCode ?? 'request failed'})`);
						process.stdout.write(
							`[${kleur.red('✖')}] ${groups.link} (${kleur.red(res?.statusCode ?? 'request failed')})`,
						);
					} else if (res.statusCode === 200) {
						process.stdout.write(`[${kleur.green('✔')}] ${groups.link} (${kleur.green(res.statusCode)})`);
					} else {
						warnings.push({
							name: key,
							description: `Non-200 statuscode response on: ${groups.link} (${res.statusCode})`,
						});
						process.stdout.write(`[${kleur.yellow('✔')}] ${groups.link} (${kleur.yellow(res.statusCode)})`);
					}
				}
			}

			if (invalidLinks.length) {
				conflicts.push({
					firstName: key,
					secondName: '',
					conflictKeyWords: invalidLinks,
					type: ConflictType.Status404Link,
				});
			}
		}

		if (tag.hoisted) {
			hoisted++;
		}

		if (tag.keywords.includes(key)) {
			conflicts.push({
				firstName: key,
				secondName: '',
				conflictKeyWords: [],
				type: ConflictType.NameNotInKeywords,
			});
		}

		if (key !== key.toLowerCase()) {
			conflicts.push({
				firstName: key,
				secondName: '',
				conflictKeyWords: [],
				type: ConflictType.NameLowercase,
			});
		}

		if (tag.keywords.some((keyword) => !keyword.replaceAll(/\s+/g, '').length)) {
			conflicts.push({
				firstName: key,
				secondName: '',
				conflictKeyWords: [],
				type: ConflictType.NonEmptyKeyword,
			});
		}

		if (!tag.content.replaceAll(/\s+/g, '').length) {
			conflicts.push({
				firstName: key,
				secondName: '',
				conflictKeyWords: [],
				type: ConflictType.NonEmptyBody,
			});
		}

		const whiteSpaceKeywords = tag.keywords.filter((keyword) => /\s/.exec(keyword));
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
				const conflictKeyWords = tag.keywords.filter(
					(keyword) => oV.keywords.includes(keyword) || otherKey === keyword,
				);

				if (
					conflictKeyWords.length &&
					!conflicts.some((conflict) =>
						[conflict.firstName, conflict.secondName].every((element) => [key, otherKey].includes(element)),
					)
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
		const parts: string[] = [];
		const {
			uniqueConflicts,
			emptyKeywordConflicts,
			emptyBodyConflicts,
			noWhiteSpaceConflicts,
			status404LinkConflicts,
			nameNotInKeywordsConflicts,
			nameLowercaseConflicts,
		} = conflicts.reduce(
			(a, conflict) => {
				switch (conflict.type) {
					case ConflictType.NameNotInKeywords:
						a.nameNotInKeywordsConflicts.push(conflict);
						break;
					case ConflictType.UniqueKeywords:
						a.uniqueConflicts.push(conflict);
						break;
					case ConflictType.NonEmptyKeyword:
						a.emptyKeywordConflicts.push(conflict);
						break;
					case ConflictType.NonEmptyBody:
						a.emptyBodyConflicts.push(conflict);
						break;
					case ConflictType.NoWhiteSpace:
						a.noWhiteSpaceConflicts.push(conflict);
						break;
					case ConflictType.Status404Link:
						a.status404LinkConflicts.push(conflict);
						break;
					case ConflictType.NameLowercase:
						a.nameLowercaseConflicts.push(conflict);
				}

				return a;
			},
			{
				nameNotInKeywordsConflicts: [] as Conflict[],
				uniqueConflicts: [] as Conflict[],
				emptyKeywordConflicts: [] as Conflict[],
				emptyBodyConflicts: [] as Conflict[],
				noWhiteSpaceConflicts: [] as Conflict[],
				status404LinkConflicts: [] as Conflict[],
				nameLowercaseConflicts: [] as Conflict[],
			},
		);

		if (nameNotInKeywordsConflicts.length) {
			parts.push(
				`Tag validation error: Tag name should not be included in keywords:\n${nameNotInKeywordsConflicts
					.map((conflict, index) => kleur.red(`${index}. [${conflict.firstName}]`))
					.join('\n')}`,
			);
		}

		if (uniqueConflicts.length) {
			parts.push(
				`Tag validation error: Tag names and keywords have to be unique:\n${uniqueConflicts
					.map((conflict, index) =>
						kleur.red(
							`${index}. [${conflict.firstName}] <> [${
								conflict.secondName
							}]: conflicts: ${conflict.conflictKeyWords.join(', ')}`,
						),
					)
					.join('\n')}`,
			);
		}

		if (emptyBodyConflicts.length) {
			parts.push(
				`Tag validation error: Tag body cannot be empty:\n${emptyBodyConflicts
					.map((conflict, index) => kleur.red(`${index}. [${conflict.firstName}]`))
					.join('\n')}`,
			);
		}

		if (nameLowercaseConflicts.length) {
			parts.push(
				`Tag validation error: Tag name has to be lowercase:\n${nameLowercaseConflicts
					.map((conflict, index) => kleur.red(`${index}. [${conflict.firstName}]`))
					.join('\n')}`,
			);
		}

		if (emptyKeywordConflicts.length) {
			parts.push(
				`Tag validation error: Tag keywords cannot be empty:\n${emptyKeywordConflicts
					.map((conflict, index) => kleur.red(`${index}. [${conflict.firstName}]`))
					.join('\n')}`,
			);
		}

		if (noWhiteSpaceConflicts.length) {
			parts.push(
				`Tag validation error: Tag names and keywords cannot include whitespace (use - instead):\n${noWhiteSpaceConflicts
					.map((conflict, index) =>
						kleur.red(`${index}. tag: ${conflict.firstName}: ${conflict.conflictKeyWords.join(', ')}`),
					)
					.join('\n')}`,
			);
		}

		if (status404LinkConflicts.length) {
			parts.push(
				`Tag validation error: Links returned a 404 status code:\n${status404LinkConflicts
					.map((conflict, index) =>
						kleur.red(`${index}. tag: ${conflict.firstName}: ${conflict.conflictKeyWords.join(', ')}`),
					)
					.join('\n')}`,
			);
		}

		if (hoisted > AUTOCOMPLETE_MAX_ITEMS) {
			parts.push(`Amount of hoisted tags exceeds ${AUTOCOMPLETE_MAX_ITEMS} (is ${hoisted})`);
		}

		if (warnings.length) {
			printWarnings(warnings, process.stderr);
		}

		return {
			warnings: [],
			errors: parts,
		};
	}

	return {
		warnings,
		errors: [],
	};
}

export function processResults(result: ValidationResult) {
	if (result.warnings.length) {
		printWarnings(result.warnings, process.stderr);
	}

	if (result.errors.length) {
		process.stderr.write('\n');
		process.stderr.write(result.errors.join('\n\n'));
		process.stderr.write('\n');
		process.stderr.write(kleur.red('\n\nTag validation failed\n\n'));
		process.exit(1);
	}

	process.stdout.write(kleur.green(`\n\nTag validation passed with ${result.warnings.length} warnings 🎉\n\n`));
	process.exit(0);
}

export async function validateTagsScript(runResponseValidation: boolean) {
	const result = await validateTags(runResponseValidation);
	processResults(result);
}
