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
import { CustomSourcesString } from '../types/discordjs-docs-parser';
import { DTypesCommand } from '../interactions/discordtypes';

type CommandAutoCompleteName = 'docs' | 'tag' | 'mdn' | 'guide' | 'discorddocs' | 'dtypes';

export async function handleApplicationCommandAutocomplete(
	res: Response,
	message: APIApplicationCommandAutocompleteInteraction,
	tagCache: Collection<string, Tag>,
	mdnIndexCache: MDNIndexEntry[],
	customSources: Map<CustomSourcesString, string>,
) {
	const data = message.data;
	const name = data.name as CommandAutoCompleteName;
	switch (name) {
		case 'docs': {
			await djsDocsAutoComplete(res, data.options, customSources);
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
				process.env.DDOCS_ALGOLIA_KEY!,
				'discord',
			);
			break;
		}
		case 'mdn': {
			await mdnAutoComplete(res, data.options, mdnIndexCache);
			break;
		}
		case 'dtypes': {
			const args = transformInteraction<typeof DTypesCommand>(data.options);

			if (args.query === '') {
				res.end(JSON.stringify({ choices: [] }));
				return;
			}

			const prefix = (args.version ?? 'no-filter') === 'no-filter' ? '' : args.version!;
			const query = `${prefix} ${args.query}`.trim();

			await algoliaAutoComplete(
				res,
				query,
				process.env.DTYPES_ALGOLIA_APP!,
				process.env.DTYPES_ALGOLIA_KEY!,
				'discord-api-types',
			);
			break;
		}
	}
}
