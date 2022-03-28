import { userMention } from '@discordjs/builders';

export function truncate(text: string, len: number, splitChar = ' '): string {
	if (text.length <= len) return text;
	const words = text.split(splitChar);
	const res: string[] = [];
	for (const word of words) {
		const full = res.join(splitChar);
		if (full.length + word.length + 1 <= len - 3) {
			res.push(word);
		}
	}

	const resText = res.join(splitChar);
	return resText.length === text.length ? resText : `${resText.trim()}...`;
}

export function suggestionString(suggestionType: string, guaranteed?: string, target?: string): string {
	const [first, ...rest] = suggestionType;
	const messageParts = [];
	if (target) {
		messageParts.push(`*${first.toUpperCase()}${rest.join('')} suggestion for ${userMention(target)}:*\n`);
	}

	if (guaranteed) {
		messageParts.push(guaranteed);
	}

	return messageParts.join('');
}
