const replacements = {
	'https://discord-api-types.dev/api/next/discord-api-types-': '{{FULL_DTYPES}}',
	'https://discord-api-types.dev/api/': '{{DTYPES}}',
	'discord-api-types-': '{{D-API}}',
};

export function compactAlgoliaObjectId(url: string): string {
	let res = url;
	for (const [key, value] of Object.entries(replacements)) {
		res = res.replace(key, value);
	}

	return res;
}

export function expandAlgoliaObjectId(url: string): string {
	let res = url;
	for (const [key, value] of Object.entries(replacements)) {
		res = res.replace(value, key);
	}

	return res;
}
