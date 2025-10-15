#! /bin/bash

if [ "$ENV" = "dev" ]; then
	podman-compose -p discord-utils-bot-dev down && podman-compose -f ./compose.dev.yml -p discord-utils-bot-dev up --build
else
	podman-compose -p discord-utils-bot down && podman-compose -f ./compose.yml -p discord-utils-bot up --build
fi
