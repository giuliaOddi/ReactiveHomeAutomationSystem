FROM node:12-alpine
COPY . .
RUN npm install
CMD nvm install v16.13.0
CMD nvm use
CMD node ./src/server.js -p 4000

