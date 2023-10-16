'use strict';

import util from 'util';
import {Server} from 'http';
import {v4 as uuid} from 'uuid';
import express from 'express';
import methodOverride from 'method-override';
import bodyParser from 'body-parser';
import compression from 'compression';
import {WebSocketServer} from 'ws';
import opts from './options.js';
import {routes} from './routes.js';

// possible states of windows and door
const OPEN = 1;
const CLOSE = 0;
const ERROR = -1;

// possible actions
const ADD = 2;
const REMOVE = 3;

// list of actual windows and doors  
export var sensors = [ 
  { type: 'window', name: 'window1', state: CLOSE},
  { type: 'window',  name: 'window2', state: CLOSE},
  { type: 'door',  name: 'door1', state: CLOSE},
]; 

/**
 * Initializes the application middlewares.
 *
 * @param {Express} app Express application
 */
function init(app) {
  app.use(compression());
  app.use(methodOverride());
  app.use(bodyParser.json());
  app.use(bodyParser.urlencoded({extended: true}));

  // sets the correlation id of any incoming requests
  app.use((req, res, next) => {
    req.correlationId = req.get('X-Request-ID') || uuid();
    res.set('X-Request-ID', req.correlationId);
    next();
  });
}

/**
 * Initializes the WebSocket server.
 * @param {Server} server HTTP server
 * @param {{iface: string, port: number}} config Configuration options
 * @return {WebSocketServer} A WebSocket server
 */
function initWss(server, config) {
  // configuration taken from: https://www.npmjs.com/package/ws#websocket-compression
  const perMessageDeflate = {
    zlibDeflateOptions: {
      chunkSize: 1024,
      memLevel: 7,
      level: 3
    },
    zlibInflateOptions: {
      chunkSize: 10 * 1024
    },
    clientNoContextTakeover: true, // Defaults to negotiated value
    serverNoContextTakeover: true, // Defaults to negotiated value
    serverMaxWindowBits: 10, // Defaults to negotiated value
    concurrencyLimit: 10, // Limits zlib concurrency for perf
    threshold: 1024 // Size (in bytes) below which messages should not be compressed if context takeover is disabled
  };

  const opts = {server, perMessageDeflate};
  return new WebSocketServer(opts);
}

/**
 * Installs fallback error handlers.
 *
 * @param app Express application
 * @returns {void}
 */
function fallbacks(app) {
  // generic error handler => err.status || 500 + json
  // NOTE keep the `next` parameter even if unused, this is mandatory for Express 4
  /* eslint-disable-next-line no-unused-vars */
  app.use((err, req, res, next) => {
    const errmsg = err.message || util.inspect(err);
    console.error(`💥 Unexpected error occurred while calling ${req.path}: ${errmsg}`);
    res.status(err.status || 500);
    res.json({error: err.message || 'Internal server error'});
  });

  // if we are here, then there's no valid route => 400 + json
  // NOTE keep the `next` parameter even if unused, this is mandatory for Express 4
  /* eslint-disable no-unused-vars */
  app.use((req, res, next) => {
    console.error(`💥 Route not found to ${req.path}`);
    res.status(404);
    res.json({error: 'Not found'});
  });
}

async function run() {
  // creates the configuration options
  const options = opts();
  console.debug('🔧 Configuration', options);
  console.debug(`🔧 Initializing Express...`);
  const app = express();
  init(app);
  const {iface, port} = options.config;
  const server = app.listen(port, iface, () => {
    console.info(`🏁 Server listening: http://${iface}:${port}`);
  });

  // communication with backend
  console.debug(`🔧 Initializing WSS...`);
  const wss = initWss(server, options.config);
  console.debug(`🔧 Initializing routes...`);
  routes(app, wss, options.config);
  fallbacks(app);

  // backchannel with actuator
  const appBack = express();
  appBack.use(express.json());
  const portBack = 3000;
  appBack.listen(portBack, () => {
    console.log("Server Listening on PORT:", portBack);
  });

  // data received from actuator to change states
  appBack.post("/change-state", (request, response) => {
    const postData = request.body;
    
    // update the list -> changing state 
    sensors = sensors.map(item => (item.type == postData.sensor_type && item.name == postData.sensor_name) ? { "type" : item.type, "name" : item.name, "state" : postData.action} : item ); 
    console.log("Updated sensors list: ", sensors);
  });
  
  // data received from actuator to remove a window-door or add a new one 
  appBack.post("/add-sensor", (request, response) => {
    const postData = request.body;

    // received action: add a new sensor 
    if(postData.action == ADD){
      // update the window-doors list -> adding a new one 
      sensors.push({"type" : postData.sensor_type, "name" : postData.sensor_name, "state" : postData.state}); 
    }
    // received action: remove an existing sensor 
    else if(postData.action == REMOVE){
      // update the widnow-doors list -> removing the specific one 
      sensors = sensors.filter( item => item.name !== postData.sensor_name );
    }
    console.log("Updated sensors list: ", sensors);
  });
}

run().then(() => {
  console.info('🏃 Application up and running');
}).catch(err => {
  console.error('💩 Oh shit...', err);
});
