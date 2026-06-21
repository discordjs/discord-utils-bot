type ZendeskEntity = {
	author_id: number;
	body: string;
	comments_disabled: boolean;
	content_tag_ids: number[];
	created_at: string;
	draft: boolean;
	edited_at: string;
	html_url: string;
	id: number;
	label_names: string[];
	locale: string;
	name: string;
	outdated: boolean;
	outdated_locales: string[];
	permission_group_id: number;
	position: number;
	promoted: boolean;
	section_id: number;
	source_locale: string;
	title: string;
	updated_at: string | null;
	url: string;
	user_segment_id: number | null;
	vote_count: number;
	vote_sum: number;
};

export type ZendeskSearchResult = ZendeskEntity & {
	result_type: string;
	snippet: string;
};

export type ZendeskArticle = {
	article: ZendeskEntity;
};

export type ZendeskSearchResponse = {
	count: number;
	page: number;
	page_count: number;
	per_page: number;
	previous_page: number | null;
	results: ZendeskSearchResult[];
};
