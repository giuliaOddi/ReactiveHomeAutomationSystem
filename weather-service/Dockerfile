FROM node:12-alpine
COPY . .
CMD nvm install v16.13.0
CMD nvm use
RUN npm install
CMD node ./src/server.js -p 5000

