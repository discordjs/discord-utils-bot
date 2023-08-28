const replacements = {
	'https://discord-api-types.dev/api/next/discord-api-types-': '{{FULL_DTYPES}}',
	'https://discord-api-types.dev/api/': '{{DTYPES}}',
	'discord-api-types-': '{{D-API}}',
};

export function compactAlgoliaObjectId(url: string): string {
	for (const [key, value] of Object.entries(replacements)) {
		url = url.replace(key, value);
	}

	return url;
}

export function expandAlgoliaObjectId(url: string): string {
	for (const [key, value] of Object.entries(replacements)) {
		url = url.replace(value, key);
	}

	return url;
}
