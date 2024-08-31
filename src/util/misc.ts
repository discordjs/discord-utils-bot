/**
 * Transform provided text to Titlecase
 * (words shorter than 3 characters are lowercased)
 *
 * @param text - The text to fransform
 * @returns Transformed text
 */
export function toTitlecase(text: string) {
	return text
		.trim()
		.split(' ')
		.map((word) => {
			if (word.length < 3) {
				return word.toLowerCase();
			}

			return word[0]!.toUpperCase() + word.slice(1);
		})
		.join(' ');
}
