import { deploy } from './deploy';

const data = [
	{
		name: 'docs',
		description: 'Display discord.js documentation',
		options: [
			{
				type: 3,
				name: 'query',
				description: 'Class or Class#method combination to search for',
				required: true,
			},
			{
				name: 'target',
				description: 'User to mention',
				required: false,
				type: 6,
			},
			{
				type: 3,
				name: 'source',
				description: 'Source repository to use',
				choices: [
					{
						name: 'collection (util structure)',
						value: 'collection',
					},
					{
						name: 'discord.js@dev',
						value: 'main',
					},
					{
						name: 'stable (default)',
						value: 'stable',
					},
				],
			},
		],
	},
	{
		name: 'guide',
		description: 'Search discordjs.guide',
		options: [
			{
				name: 'query',
				description: 'Phrase to search for',
				required: true,
				type: 3,
			},
			{
				name: 'target',
				description: 'User to mention',
				required: false,
				type: 6,
			},
			{
				name: 'results',
				description: 'How many search results to display at most',
				required: false,
				type: 4,
				choices: [
					{
						name: '1 result',
						value: 1,
					},
					{
						name: '2 results (default)',
						value: 2,
					},
					{
						name: '3 results',
						value: 3,
					},
					{
						name: '4 results',
						value: 4,
					},
					{
						name: '5 results',
						value: 5,
					},
				],
			},
		],
	},
	{
		name: 'mdn',
		description: 'Search the Mozilla Developer Network documentation',
		options: [
			{
				name: 'query',
				description: 'Class or method to search for',
				required: true,
				type: 3,
			},
			{
				name: 'target',
				description: 'User to mention',
				required: false,
				type: 6,
			},
		],
	},
	{
		name: 'node',
		description: 'Search the Node.js documentation',
		options: [
			{
				name: 'query',
				description: 'Class, method or event to search for',
				required: true,
				type: 3,
			},
			{
				name: 'target',
				description: 'User to mention',
				required: false,
				type: 6,
			},
		],
	},
	{
		name: 'invite',
		description: 'Use discord.js docs in your server!',
	},
	{
		name: 'tag',
		description: 'Send a tag by name or alias',
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
	},
	{
		name: 'tagsearch',
		description: 'Query and select a tag by name, alias or content',
		options: [
			{
				type: 3,
				name: 'query',
				description: 'Tag name, alias, or content',
				required: true,
			},
			{
				name: 'target',
				description: 'User to mention',
				required: false,
				type: 6,
			},
		],
	},
];

void deploy(data);
