import { readFileSync } from 'fs';
import { join } from 'path';
import * as TOML from '@ltd/j-toml';
import { Tag } from '../functions/tag';
import kleur from 'kleur';

type ConflictType = 'uniqueKeywords' | 'headerInKeywords' | 'emptyKeyword';

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
	for (const [key, value] of Object.entries(data)) {
		for (const [otherKey, otherValue] of Object.entries(data)) {
			const v = value as unknown as Tag;
			const oV = otherValue as unknown as Tag;
			if (
				(v.keywords.some((k) => !k.replace(/\s+/g, '').length) || !v.content.replace(/\s+/g, '').length) &&
				!conflicts.some((c) => c.type === 'emptyKeyword' && c.firstName === key)
			) {
				conflicts.push({
					firstName: key,
					secondName: '',
					conflictKeyWords: [],
					type: 'emptyKeyword',
				});
			}
			if (key !== otherKey) {
				if (!v.keywords.includes(key) && !conflicts.some((c) => c.type === 'headerInKeywords' && c.firstName === key)) {
					conflicts.push({
						firstName: key,
						secondName: '',
						conflictKeyWords: [],
						type: 'headerInKeywords',
					});
				}
				const conflictKeyWords = v.keywords.filter((k) => oV.keywords.includes(k));
				if (
					conflictKeyWords.length &&
					!conflicts.some((c) => [c.firstName, c.secondName].every((e) => [key, otherKey].includes(e)))
				) {
					conflicts.push({
						firstName: key,
						secondName: otherKey,
						conflictKeyWords,
						type: 'uniqueKeywords',
					});
				}
			}
		}
	}

	if (conflicts.length) {
		const parts = [];
		const { uniqueConflicts, headerConflicts, emptyConflicts } = conflicts.reduce(
			(a, c) => {
				if (c.type === 'uniqueKeywords') {
					a.uniqueConflicts.push(c);
				}
				if (c.type === 'headerInKeywords') {
					a.headerConflicts.push(c);
				}
				if (c.type === 'emptyKeyword') {
					a.emptyConflicts.push(c);
				}
				return a;
			},
			{
				uniqueConflicts: [] as Conflict[],
				headerConflicts: [] as Conflict[],
				emptyConflicts: [] as Conflict[],
			},
		);

		if (uniqueConflicts.length) {
			parts.push(
				`Tag validation error: Keywords have to be unique:\n${uniqueConflicts
					.map(
						(c, i) =>
							`${kleur.yellow(`${i}.`)} [${c.firstName}]${kleur.yellow('⚡')}[${
								c.secondName
							}]: keywords: ${c.conflictKeyWords.join(', ')}`,
					)
					.join('\n')}`,
			);
		}
		if (headerConflicts.length) {
			parts.push(
				`Tag validation error: Tag header must be part of keywords:\n${headerConflicts
					.map((c, i) => `${kleur.yellow(`${i}.`)} [${c.firstName}]${kleur.yellow('⚡')}`)
					.join('\n')}`,
			);
		}

		if (emptyConflicts.length) {
			parts.push(
				`Tag validation error: Tag keywords and body can not be empty:\n${emptyConflicts
					.map((c, i) => `${kleur.yellow(`${i}.`)} [${c.firstName}]${kleur.yellow('⚡')}`)
					.join('\n')}`,
			);
		}
		throw Error(parts.join('\n\n'));
	}
}

validateTags();
