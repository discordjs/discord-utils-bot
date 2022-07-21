import { userMention } from '@discordjs/builders';

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
