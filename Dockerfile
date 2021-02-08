FROM node:10

WORKDIR /workspace

COPY package.json ./

RUN npm install
RUN npm install js2xmlparser

ENV PATH /workspace/node_modules/.bin:$PATH

EXPOSE 3000