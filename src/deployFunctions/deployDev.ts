import { deploy } from './deploy';

const data = [
	{
		name: 'tag',
		description: '[🔒 Proficient] Display a tag by name or alias',
		options: [
			{
				type: 3,
				name: 'query',
				description: 'Tag name or alias',
				required: true,
			},
			{
				name: 'target',
				description: 'User to mention',
				required: false,
				type: 6,
			},
		],
		default_permission: false,
	},
	{
		name: 'tagsearch',
		description: '[🔒 Proficient] Search for a tag by name, alias or content',
		options: [
			{
				type: 3,
				name: 'query',
				description: 'Tag name, alias, or content',
				required: true,
			},
		],
		default_permission: false,
	},
];

void deploy(data, true);
