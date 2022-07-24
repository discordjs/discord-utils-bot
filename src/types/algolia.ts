export interface AlgoliaSearchResult {
	hits?: AlgoliaHit[];
	query: string;
}

export interface AlgoliaHit {
	anchor: string;
	content: string | null;
	hierarchy: AlgoliaHitHierarchy;
	url: string;
	objectID: string;
}

export interface AlgoliaHitHierarchy {
	lvl0: string | null;
	lvl1: string | null;
	lvl2: string | null;
	lvl3: string | null;
	lvl4: string | null;
	lvl5: string | null;
	lvl6: string | null;
}
