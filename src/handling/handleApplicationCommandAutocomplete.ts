import process from 'node:process';
import type { Collection } from '@discordjs/collection';
import type { APIApplicationCommandAutocompleteInteraction } from 'discord-api-types/v10';
import type { Response } from 'polka';
import { algoliaAutoComplete } from '../functions/autocomplete/algoliaAutoComplete.js';
import { djsAutoComplete } from '../functions/autocomplete/docsAutoComplete.js';
import { mdnAutoComplete } from '../functions/autocomplete/mdnAutoComplete.js';
import { nodeAutoComplete } from '../functions/autocomplete/nodeAutoComplete.js';
import { oramaAutocomplete } from '../functions/autocomplete/oramaAutoComplete.js';
import { tagAutoComplete } from '../functions/autocomplete/tagAutoComplete.js';
import type { Tag } from '../functions/tag.js';
import type { DTypesCommand } from '../interactions/discordtypes.js';
import type { GuideCommand } from '../interactions/guide.js';
import type { NodeCommand } from '../interactions/node.js';
import type { MDNIndexEntry } from '../types/mdn.js';
import { transformInteraction } from '../util/interactionOptions.js';

type CommandAutoCompleteName = 'discorddocs' | 'docs' | 'dtypes' | 'guide' | 'mdn' | 'node' | 'tag';

export async function handleApplicationCommandAutocomplete(
	res: Response,
	message: APIApplicationCommandAutocompleteInteraction,
	tagCache: Collection<string, Tag>,
	mdnIndexCache: MDNIndexEntry[],
) {
	const data = message.data;
	const name = data.name as CommandAutoCompleteName;
	switch (name) {
		case 'node': {
			const args = transformInteraction<typeof NodeCommand>(data.options);
			await nodeAutoComplete(res, args.query);
			break;
		}

		case 'docs': {
			await djsAutoComplete(res, data.options);
			break;
		}

		case 'tag': {
			tagAutoComplete(res, data.options, tagCache);
			break;
		}

		case 'guide': {
			const args = transformInteraction<typeof GuideCommand>(data.options);
			await oramaAutocomplete(res, args.query);
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
			mdnAutoComplete(res, data.options, mdnIndexCache);
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
