FROM node:20-alpine
LABEL name "slash-utils-dev"
LABEL version "0.0.0"
LABEL maintainer "almostSouji <https://github.com/almostSouji>"
ENV FORCE_COLOR=1
WORKDIR /usr/slash-utils
COPY package.json ./
COPY . .
RUN yarn build
CMD ["yarn", "start"]
