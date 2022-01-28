'use strict';
const bodyParser = require('body-parser');
const cors = require('cors');
const express = require('express');
const http = require('http');
const dotenv = require('dotenv');
dotenv.config({ path: './config/config.env' });

const HEARTBEAT_INTERVAL = 60000;

const WebSocket = require('ws');

const app = express();
app.use(bodyParser.urlencoded({ extended: true }))
app.use(cors());
app.use(express.json());

const clients = new Set();
app.use(express.static('public'));

const server = http.createServer(app);
const wss = new WebSocket.Server({ clientTracking: false, noServer: true });

server.on('upgrade', function(request, socket, head) {
    wss.handleUpgrade(request, socket, head, function(ws) {
      wss.emit('connection', ws, request);
    });
});

wss.on('connection', function(ws, req) {
  const id = new URLSearchParams(req.url.substr(2)).get('id');  
  ws.id = id;
  console.log(`${ws.id} connected`);
  clients.add(ws);
  app.set('clients', clients);

  ws.on('message', function(message) {
    console.log('message: ', message);
    let data = JSON.parse(message);
    for(let client of clients) {
      if(client.id === data.id && client !== ws) {
        console.log('client message: ', message);
        client.send(message);
      }
    }
  });

  const interval = setInterval(function ping() {
    for(let client of clients) {
      client.send(JSON.stringify({
        id: client.id,
        type: 'HeartBit',
        value: '1'
      }));
    };
  }, HEARTBEAT_INTERVAL);

  ws.on('close', function() {
    clients.delete(ws);
    clearInterval(interval);
    console.log('closed')
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, function() {
  console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
});