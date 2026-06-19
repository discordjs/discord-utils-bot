<div align="center">
  <br />
  <p>
    <a href="https://discord.js.org"><img src="https://discord.js.org/static/logo.svg" width="546" alt="discord.js" /></a>
  </p>
  <br />
  <p>
    <a href="https://discord.gg/djs"><img src="https://img.shields.io/badge/join_us-on_discord-5865F2?logo=discord&logoColor=white" alt="Discord server" /></a>
    <a href="https://opencollective.com/discordjs"><img src="https://img.shields.io/opencollective/backers/discordjs?maxAge=3600&logo=opencollective" alt="backers" /></a>
  </p>
</div>

# Contributing tags

New tags are added via pull requests. Please provide the tag content as PR description and `Tag: ` followed by the tag name as pull request title.

Add new tags in `./tags/tags.toml` in the following format:

```toml
[tag-name]
keywords = ["keyword", "another-keyword"]
content = """
Put your tag content here!
"""

```

- Tag names and keywords have to use `-` instead of spaces
- Backslashes have to be escaped! `\\`
- Code blocks work and newlines are respected
- The application uses slash command interactions only, you can use emojis from the Discord server (please do not use global emojis from other servers, as we can't control them being deleted at any point)
- You can use masked link syntax `[discord.js](https://discord.js.org 'discord.js website')` (links do not need to be escaped because of the message flag set on all responses).
- The repository includes vscode code-snippets for tags, "learn more" links, and an arrow character.
- You can test tags through the bot (for example in our [discord server](https://discord.gg/djs)) with `/testtag`.

# Setup

> [!WARNING]
> The discord.js portion of this app requires direct access to the underlying storage layer.

## Deploy Commands

```sh
yarn build && yarn deploy:glob # deploy commands globally
yarn build && yarn deploy:dev # deploy commands to dev server
```

```sh
yarn build && yarn deploy-dev:glob # deploy commands globally (dev instance)
yarn build && yarn deploy-dev:dev # deploy commands to dev server (dev instance)
```

## Start App

```sh
ENV=dev ./start.sh # dev token
./start.sh # prod token
```

```sh
LOGLEVEL=debug ENV=dev ./start.sh # dev token (logger level debug)
LOGLEVEL=warn ./start.sh # prod token (logger level warning)
```

> [!NOTE]
> Valid log levels are standards defined by pino `fatal`, `error`, `warn`, `info`, `debug`, `trace`, `silent`.
> Other values will throw to avoid typos

