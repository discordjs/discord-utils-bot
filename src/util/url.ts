import { URL } from 'node:url';

/**
 * Transform a link into an URL or null, if invalid
 *
 * @param url - The link to transform
 * @returns The URL instance, if valid
 */
export function urlOption(url: string) {
	try {
		return new URL(url);
	} catch {
		return null;
	}
}
