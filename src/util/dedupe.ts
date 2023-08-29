import type { AlgoliaHit } from '../types/algolia.js';

export function dedupeAlgoliaHits(): (hit: AlgoliaHit) => boolean {
	const dedupe = new Set<string>();
	return (hit: AlgoliaHit) => Boolean(!dedupe.has(hit.objectID) && dedupe.add(hit.objectID));
}
