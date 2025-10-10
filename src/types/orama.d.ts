export type OramaSearchResult = {
	content: string;
	id: string;
	type: 'heading' | 'page' | 'text';
	url: string;
};

export type OramaSearchResults = OramaSearchResult[];
