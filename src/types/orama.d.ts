export type OramaSearchResult = {
	id: string;
	content: string;
	type: 'text' | 'heading' | 'page';
	url: string;
};

export type OramaSearchResults = OramaSearchResult[];
