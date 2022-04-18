import Collection from '@discordjs/collection';
import { APIApplicationCommandAutocompleteInteraction } from 'discord-api-types/v10';
import { algoliaAutoComplete } from '../functions/autocomplete/algoliaAutoComplete';
import { djsDocsAutoComplete } from '../functions/autocomplete/docsAutoComplete';
import { mdnAutoComplete } from '../functions/autocomplete/mdnAutoComplete';
import { tagAutoComplete } from '../functions/autocomplete/tagAutoComplete';
import { Tag } from '../functions/tag';
import { GuideCommand } from '../interactions/guide';
import { transformInteraction } from '../util';
import { Response } from 'polka';
import { MDNIndexEntry } from '../types/mdn';

type CommandAutoCompleteName = 'docs' | 'tag' | 'mdn' | 'guide' | 'discorddocs';

export async function handleApplicationCommandAutocomplete(
	res: Response,
	message: APIApplicationCommandAutocompleteInteraction,
	tagCache: Collection<string, Tag>,
	mdnIndexCache: MDNIndexEntry[],
) {
	const data = message.data;
	const name = data.name as CommandAutoCompleteName;
	switch (name) {
		case 'docs': {
			await djsDocsAutoComplete(res, data.options);
			break;
		}
		case 'tag': {
			await tagAutoComplete(res, data.options, tagCache);
			break;
		}
		case 'guide': {
			const args = transformInteraction<typeof GuideCommand>(data.options);
			await algoliaAutoComplete(
				res,
				args.query,
				process.env.DJS_GUIDE_ALGOLIA_APP!,
				process.env.DJS_GUIDE_ALGOLIA_KEY!,
				'discordjs',
			);
			break;
		}
		case 'discorddocs': {
			const args = transformInteraction<typeof GuideCommand>(data.options);
			await algoliaAutoComplete(
				res,
				args.query,
				process.env.DDOCS_ALGOLIA_APP!,
				process.env.DDOCS_ALOGLIA_KEY!,
				'discord',
			);
			break;
		}
		case 'mdn': {
			await mdnAutoComplete(res, data.options, mdnIndexCache);
			break;
		}
	}
}
