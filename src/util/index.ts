export function formatEmoji(emojiId: string, animated = false): string {
	return `<${animated ? 'a' : ''}:_:${emojiId}>`;
}

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

export function suggestionString(
	suggestionType: string,
	guaranteed?: string,
	author?: string,
	target?: string,
): string {
	const messageParts = [];
	const [first, ...rest] = suggestionType;
	if (author || target) {
		messageParts.push(`*${first.toUpperCase()}${rest.join('')} suggestion`);
		if (target) {
			messageParts.push(` for <@${target}>`);
		}
		if (author) {
			messageParts.push(` from <@${author}>`);
		}
		messageParts.push(':*\n');
	}

	if (guaranteed) {
		messageParts.push(guaranteed);
	}

	return messageParts.join('');
}
