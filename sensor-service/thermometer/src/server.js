'use strict';

import util from 'util';
import {Server} from 'http';
import {v4 as uuid} from 'uuid';
import express from 'express';
import methodOverride from 'method-override';
import bodyParser from 'body-parser';
import compression from 'compression';
import {WebSocketServer} from 'ws';

// own modules
import opts from './options.js';
import {routes} from './routes.js';

// temperature in °C 
export var temperature = 20; 
var temp_diff_weather = 0;
var temp_diff_heatpump = 0; 

// Stati sensori
const ON_OPEN = 0;
const OFF_CLOSE = 1;
const ERROR = -1; 

// Lista sensori e loro stati 
var sensors_properties = []; 

// Lista termometri 
export var sensors = [
  { type : 'thermometer', name : 'thermometer1', state: ON_OPEN, temperature : temperature},
]; 

// Millisecondi salvataggio temperatura interna
var timeout; 
var millis = 2000; 
var count = 0; 

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

/**
 * 
 */
function temperature_simulation(){

  var window_open = sensors_properties.find(item => (item.type == 'window' && item.state == ON_OPEN));
  var door_open = sensors_properties.find(item => (item.type == 'door' && item.state == ON_OPEN));
  var heatpump_on = sensors_properties.find(item => (item.type == 'heatpump' && item.state == ON_OPEN));

  ///////////// se non ci sono?? se sono in errore???? ///////////

  // Caso 1: finestre e pompe di calore spente -> la temperatura non cambia
  if (!window_open && !heatpump_on){
    console.log("Windows are closed and heatpumps are off... The temperature isn't changing"); 
  }
  // Caso 2: pompa calore accesa -> temperatura aumenta in base a pompa calore con temperatura massima (controllo temp_heatpump > temp_interna)
  else if (heatpump_on && temp_diff_heatpump > 0){
    // almeno una finestra aperta
    if (window_open){
      console.log("At least one window is open and one heatpump is on... The temperature is increasing"); 
      count++;
      // fuori c'è più caldo che dentro 
      if(temp_diff_weather > 0){
        temperature += max(temp_diff_heatpump, temp_diff_weather)/3;  // tende al massimo tra temperatura pompa e temperatura fuori 
        sensors.map(item => item.temperature !== temperature ? { type : item.type, name : item.name, state : item.state, temperature : temperature } : item ); 
        console.log("Current temperature: ", temperature);
        if (count < 3){
          timeout = setTimeout(temperature_simulation, millis);
        }
      }
      // esterno c'è freddo -> tende a temperatura pompa molto lentamente 
      else {
        temperature += temp_diff_heatpump/8;  // tende al massimo tra temperatura pompa e temperatura fuori 
        sensors.map(item => item.temperature !== temperature ? { type : item.type, name : item.name, state : item.state, temperature : temperature } : item ); 
        console.log("Current temperature: ", temperature);
        if (count < 8){
          timeout = setTimeout(temperature_simulation, millis);
        }
      }
    }
    // finestre sono chiuse -> pompa calore accesa in tutta la casa quindi la porta non ci interessa
    else {
      console.log("Windows are closed and at least one heatpump is on... The temperature is increasing"); 
      count++;
      temperature += temp_diff_heatpump/5;
      sensors.map(item => item.temperature !== temperature ? { type : item.type, name : item.name, state : item.state, temperature : temperature } : item ); 
      console.log("Current temperature: ", temperature);
      if (count < 5){
        timeout = setTimeout(temperature_simulation, millis);
      }
    }
  }
  // Casi 3 e 4: finestre aperte e pompa calore spenta -> decrescita/crescita fino a temperatura weather service
  else if (window_open && !heatpump_on){
    console.log("At least one window is open and heatpumps are off... The temperature is changing"); 
    // porta aperta -> più lento perchè porta della stanza
    if (door_open){
      count++;
      temperature += temp_diff_weather/5;
      sensors.map(item => item.temperature !== temperature ? { type : item.type, name : item.name, state : item.state, temperature : temperature } : item ); 
      console.log("Current temperature: ", temperature);
      if (count < 5){
        timeout = setTimeout(temperature_simulation, millis);
      }
    }
    // porta chiusa -> più veloce perchè porta della stanza 
    else {
      count++;
      temperature += temp_diff_weather/3;
      sensors.map(item => item.temperature !== temperature ? { type : item.type, name : item.name, state : item.state, temperature : temperature } : item ); 
      console.log("Current temperature: ", temperature);
      if (count < 3){
        timeout = setTimeout(temperature_simulation, millis);
      }
    }
  }
}

async function run() {
  // creates the configuration options and the logger
  const options = opts();
  console.debug('🔧 Configuration', options);

  console.debug(`🔧 Initializing Express...`);
  const app = express();
  init(app);

  const {iface, port} = options.config;
  const server = app.listen(port, iface, () => {
    // noinspection HttpUrlsUsage
    console.info(`🏁 Server listening: http://${iface}:${port}`);
  });

  // comunication with backend

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


  // Modifica il metodo da get a post e l'endpoint in "/api/dati"
  appBack.post("/room_properties", (request, response) => {
      // Accedi ai dati inviati nel corpo della richiesta POST
      const postData = request.body;
      console.log("Messaggio arrivato");
      console.log(postData);

      if (postData.length > 0){
        // Salvataggio lista 
        sensors_properties = postData; 
        //console.log(sensor_properties); 
        count = 0;
        clearTimeout(timeout);

        // Calcolo differenze temperature con weather service
        if (sensors_properties.find(item => (item.name == 'weather-service'))){
          var weather_temperature = sensors_properties.find(item => (item.name == 'weather-service'));
          temp_diff_weather = weather_temperature.property - temperature; 
        }
        // Calcolo differenze temperature con heat pump
        if (sensors_properties.find(item => (item.type == 'heatpump'))){
          var max_temperature = Math.max(...(sensors_properties.filter(item => item.type == 'heatpump' && item.state === ON_OPEN).map(item => item.temperature)));
          temp_diff_heatpump = max_temperature - temperature;
        }        
        timeout = setTimeout(temperature_simulation, 0);
      }
      //response.sendStatus(200);
  });

}

run().then(() => {
  console.info('🏃 Application up and running');
}).catch(err => {
  console.error('💩 Oh shit...', err);
});
