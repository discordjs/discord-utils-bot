import { readFileSync } from 'fs';
import { join } from 'path';
import * as TOML from '@ltd/j-toml';
import { Tag } from '../functions/tag';
import { red } from 'kleur';
import { AUTOCOMPLETE_MAX_ITEMS } from '../util';

enum ConflictType {
	UniqueKeywords,
	HeaderInKeywords,
	NonEmptyKeyword,
	NonEmptyBody,
	EscapeLinks,
	NoWhiteSpace,
}

interface Conflict {
	firstName: string;
	secondName: string;
	conflictKeyWords: string[];
	type: ConflictType;
}

function validateTags() {
	const file = readFileSync(join(__dirname, '..', '..', 'tags', 'tags.toml'));
	const data = TOML.parse(file, 1.0, '\n');
	const conflicts: Conflict[] = [];
	let hoisted = 0;
	for (const [key, value] of Object.entries(data)) {
		const v = value as unknown as Tag;
		const codeBlockRegex = /(`{1,3}).+?\1/gs;
		const detectionRegex = /\[[^\[\]]+?\]\([^<][^\(\)]+?[^>]\)/g;
		const cleanedContent = v.content.replace(codeBlockRegex, '');

		const conflictLinks = [];
		let result: RegExpExecArray | null;
		while ((result = detectionRegex.exec(cleanedContent)) !== null) {
			conflictLinks.push(result[0]);
		}
		if (conflictLinks.length) {
			conflicts.push({
				firstName: key,
				secondName: '',
				conflictKeyWords: conflictLinks,
				type: ConflictType.EscapeLinks,
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
			linkConflicts,
			noWhiteSpaceConflicts,
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
						a.linkConflicts.push(c);
						break;
					case ConflictType.NoWhiteSpace:
						a.noWhiteSpaceConflicts.push(c);
				}
				return a;
			},
			{
				uniqueConflicts: [] as Conflict[],
				headerConflicts: [] as Conflict[],
				emptyKeywordConflicts: [] as Conflict[],
				emptyBodyConflicts: [] as Conflict[],
				noWhiteSpaceConflicts: [] as Conflict[],
				linkConflicts: [] as Conflict[],
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

		if (linkConflicts.length) {
			parts.push(
				`Tag validation error: Masked links need to be escaped as [label](<link>):\n${linkConflicts
					.map((c, i) => red(`${i}. tag: ${c.firstName}: ${c.conflictKeyWords.join(', ')}`))
					.join('\n')}`,
			);
		}

		if (hoisted > AUTOCOMPLETE_MAX_ITEMS) {
			parts.push(`Amount of hoisted tags exceeds ${AUTOCOMPLETE_MAX_ITEMS} (is ${hoisted})`);
		}

		// eslint-disable-next-line no-console
		console.error(parts.join('\n\n'));
		process.exit(1);
	}
	process.exit(0);
}

validateTags();
