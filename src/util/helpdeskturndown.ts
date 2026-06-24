import TurndownService from 'turndown';

export const helpdeskTurndownService = new TurndownService({
	codeBlockStyle: 'fenced',
	headingStyle: 'atx',
})
	.addRule('remove toc', {
		filter: (node) => {
			return node.nodeName === 'DIV' && node.classList.contains('toc-box');
		},
		replacement: () => '',
	})
	.addRule('info admonition', {
		filter: (node) => {
			return node.nodeName === 'DIV' && ['info-box', 'exp-box'].some((className) => node.classList.contains(className));
		},
		replacement: (content) => {
			return `${['> [!NOTE]', ...content.split(/\n+/g).map((line) => `> ${line}`)].join('\n').trim()}\n`;
		},
	})
	.addRule('warn admonition', {
		filter: (node) => {
			return node.nodeName === 'DIV' && node.classList.contains('warn-box');
		},
		replacement: (content) => {
			return `${['> [!WARNING]', ...content.split(/\n+/g).map((line) => `> ${line}`)].join('\n').trim()}\n`;
		},
	})
	.addRule('tip admonition', {
		filter: (node) => {
			return node.nodeName === 'DIV' && node.classList.contains('tip-box');
		},
		replacement: (content) => {
			return `${['> [!TIP]', ...content.split(/\n+/g).map((line) => `> ${line}`)].join('\n').trim()}\n`;
		},
	})
	.addRule('headings with anchors', {
		filter: (node) => {
			return ['H1', 'H2'].includes(node.nodeName) && Boolean(node.id);
		},
		replacement: (content, node) => {
			if ('id' in node) {
				return `#[${content}](#${node.id})\n`;
			}

			return '';
		},
	});
