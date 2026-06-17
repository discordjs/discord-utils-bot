export type MintlifyResultMetadata = {
	breadcrumbs: string[];
	hash: string;
	icon: string;
	openapi: string;
	title: string;
};

export type MintlifyResult = {
	content: string;
	header: string;
	metadata: MintlifyResultMetadata;
	page: string;
	score: number;
};

export type MintlifySearchResult = {
	results: MintlifyResult[];
};
