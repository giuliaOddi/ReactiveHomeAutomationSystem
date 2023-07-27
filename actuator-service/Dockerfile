FROM node:12-alpine
COPY . .
RUN npm install 
CMD nvm use
CMD node ./src/server.js -p 3000
EXPOSE 3000
