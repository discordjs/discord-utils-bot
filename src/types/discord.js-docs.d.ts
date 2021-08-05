declare module 'discord.js-docs' {
	interface Doc {
		fetch(src: string, options: { force: boolean }): Promise<Doc>;
		formatType(types: DocTypedef[] | DocElement[]): string;
		get(...query: string[]): DocElement | null;
		search(...query: string[]): DocElement[] | null;
		baseDocsURL: string;
	}

	const Doc: Doc;
	export = Doc;
}

interface DocElement {
	formattedDescription: string | null;
	formattedName: string;
	description: string | null;
	link: string | null;
	url: string | null;
	static: boolean;
	extends: DocElement[] | null;
	implements: DocElement[] | null;
	access: string;
	deprecated: boolean;
	docType: string;
}

interface DocTypedef {}
