<div align="center">
  <br />
  <p>
    <a href="https://discord.js.org"><img src="https://discord.js.org/static/logo.svg" width="546" alt="discord.js" /></a>
  </p>
  <br />
  <p>
    <a href="https://discord.gg/djs"><img src="https://img.shields.io/discord/222078108977594368?color=5865F2&logo=discord&logoColor=white" alt="Discord server" /></a>
    <a href="https://www.patreon.com/discordjs"><img src="https://img.shields.io/badge/donate-patreon-F96854.svg" alt="Patreon" /></a>
  </p>
</div>

# Contributing tags

New tags are added via pull requests. Please provide the tag content as PR description and `Tag: ` followed by the tag name as pull request title.

Add new tags in `./tags/tags.toml` in the following format:

```toml
[tag-name]
keywords = ["tag-name", "alias", "another-alias"]
content = """
Put your tag content here!
"""
```

- Tag names should always use `-` over spaces
- Keywords should prioritise `-` over spaces for consistency
- Keywords need to include the name of the tag
- Backslashes have to be escaped! `\\`
- Code blocks work and newlines are respected
- The application uses slash command interactions only, you can use emojis from the Discord server (please do not use global emojis from other servers, as we can't control them being deleted at any point)
- You can use masked link syntax `[discord.js](<https://discord.js.org> 'discord.js website')` (the `<>` wrapping is required to suppress embeds in interaction responses).
- The repository includes vscode code-snippets for tags, masked links, "learn more" links, a bullet point and arrow character
