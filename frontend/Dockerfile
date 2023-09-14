# FROM node:12-alpine
# COPY ./todo-app/ .
# RUN npm install 
# CMD ["npm", "start"]


FROM httpd:2.4
COPY ./todo-app/ /usr/local/apache2/htdocs/
COPY ./my-httpd.conf /usr/local/apache2/conf/httpd.conf








