import { DJS_GUIDE_BASE } from '../util/constants.js';

export function resolveResourceFromGuideUrl(url: string) {
	const anchorSplit = url.split('#');
	const withoutAnchor = anchorSplit[0];
	const pathParts = withoutAnchor.split('/').slice(1);
	const path = pathParts.join('/');
	const githubUrlBase = `https://raw.githubusercontent.com/discordjs/discord.js/main/apps/guide/content/docs${withoutAnchor}`;
	const githubFolderEntrypointUrl = `${githubUrlBase}/index.mdx`;
	const githubUrl = `${githubUrlBase}.mdx`;
	const guideUrl = `${DJS_GUIDE_BASE}${url}`;
	const anchor = anchorSplit.length > 1 ? anchorSplit.slice(1).join('#') : undefined;

	return {
		githubUrl,
		githubFolderEntrypointUrl,
		path,
		guideUrl,
		anchor,
		endpoint: pathParts.at(-1),
	};
}

export function noCodeLines(lines: string[]) {
	const res: string[] = [];

	let withinCodeBlock = false;
	for (const line of lines) {
		if (line.startsWith('```')) {
			withinCodeBlock = !withinCodeBlock;
			continue;
		}

		if (withinCodeBlock || line.startsWith('<')) {
			continue;
		}

		res.push(line);
	}

	return res;
}
