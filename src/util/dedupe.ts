import type { AlgoliaHit } from '../types/algolia.js';

export function dedupeAlgoliaHits(): (hit: AlgoliaHit) => boolean {
	const dedupe = new Set<string>();
	return (hit: AlgoliaHit) => {
		const dedupeIdentifier = Object.values(hit.hierarchy).join('::');
		return Boolean(!dedupe.has(dedupeIdentifier) && dedupe.add(dedupeIdentifier));
	};
}
