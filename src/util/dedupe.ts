import { AlgoliaHit } from '../types/algolia';

export function dedupeAlgoliaHits(): (hit: AlgoliaHit) => boolean {
	const dedupe = new Set<string>();
	return (hit: AlgoliaHit) => Boolean(!dedupe.has(hit.objectID) && dedupe.add(hit.objectID));
}
