## Prerequisite

- MongoDB

## How to use

### Deploy

npm install
npm run-script bootstrap
npm start

### Post something

curl -X POST -H "Content-type: application/json" -d '{"title":"Fire fire!","content":"HALP! FIRE IN THE HALL!!","type":"fire"}' http://localhost:3000/item


