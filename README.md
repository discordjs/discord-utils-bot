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
