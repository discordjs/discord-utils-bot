export type CustomSourcesString = 'latest' | 'v13-lts';
export type CustomSourcesStringUnion =
	| CustomSourcesString
	| 'builders'
	| 'collection'
	| 'main'
	| 'rest'
	| 'rpc'
	| 'stable'
	| 'voice';

declare module 'discordjs-docs-parser' {
	export type SourcesStringUnion = CustomSourcesStringUnion;
}
