FROM node:12-alpine
COPY ./todo-server/ .
COPY ./todo-server/.env .
RUN npm install 
CMD ["npm", "start"] 
EXPOSE 8000
