export type CustomSourcesString = 'v13-lts' | 'latest';
export type CustomSourcesStringUnion =
	| CustomSourcesString
	| 'stable'
	| 'main'
	| 'rpc'
	| 'collection'
	| 'builders'
	| 'voice'
	| 'rest';

declare module 'discordjs-docs-parser' {
	export type SourcesStringUnion = CustomSourcesStringUnion;
}
