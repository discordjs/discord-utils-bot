# Contributing tags

New tags are added via pull requests. Please provide the tag content as PR description and `Tag: ` followed by the tag name as pull request title.

Add new tags in `./tags/tags.toml` in the following format:

```toml
[tagname]
keywords = ["tagname", "alias1", "alias2"]
content = """
Put your tag content here!
"""

```

- The application uses slash command interactions only, you can use emojis from the discord server (please do not use global emojis from other servers, as we can't control them being deleted at any point)
- You can use masked link syntax `[discord.js](<https://discord.js.org> 'discord.js website')` (the `< >` wrapping is required to suppress embeds in interaction responses).
- Keywords need to include the tag name
- Backslashes have to be escaped! `\\`
- Code blocks work and newlines are respected
- The repository inlcudes vscode code-snippets for tags, masked links, "learn more" links, a bullet point and arrow character
