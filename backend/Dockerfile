FROM node:12-alpine
COPY ./todo-server/ .
COPY ./.env .
RUN npm install 
CMD ["npm", "start"] 
EXPOSE 8000
