type DocumentationTable = {
	data: Record<string, unknown>;
	name: string;
	version: string;
};

export type Database = {
	documentation: DocumentationTable;
};
