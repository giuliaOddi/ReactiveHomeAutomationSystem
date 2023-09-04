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
import { time } from 'console';

// temperature in °C 
export var temperature = 20; 
var temp_diff_weather = 0;
var temp_diff_heatpump = 0; 

// Lista sensori e loro stati 
var sensor_properties = []; 

// Millisecondi salvataggio temperatura interna
var timeout; 
var millis = 2000; 
var count = 0; 

// Stati sensori
const ON_OPEN = 0;
const OFF_CLOSE = 1;
const ERROR = -1; 

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

  var window1_open = sensor_properties.some(item => (item.name == 'window-sensor' && item.property == ON_OPEN));
  var window2_open = sensor_properties.some(item => (item.name == 'window-sensor_2' && item.property == ON_OPEN));
  var door_open = sensor_properties.some(item => (item.name == 'door-sensor' && item.property == ON_OPEN));
  var heatpump_on = sensor_properties.some(item => (item.name == 'heat-pump' && item.property == ON_OPEN));

  ///////////// se non ci sono?? se sono in errore???? ///////////

  console.log("SIAMO NELLA FUNZIONE TEMPERATURE_SIMULATION");

  // Caso 1: finestre e porta chiuse e pompa calore spenta -> la temperatura non cambia
  if (!window1_open && !window2_open && !door_open && !heatpump_on){
    console.log("NON SUCCEDE NIENTE"); 
    //clearInterval(timeout); 
  }
  // Caso 2: pompa calore accesa -> temperatura aumenta in base a pompa calore (controllo temp_heatpump > temp_interna)
  else if (heatpump_on){
    // almeno una finestra aperta
    if (window1_open || window2_open){
      console.log("POMPA CALORE ACCESA FINESTRE APERTE.. CAMBIA TEMPERATURA...."); 
      count++;
      // valutare differenza con temperatura esterna
      //temperature += temp_diff_heatpump/5;
      //console.log("TEMPERATURA ATTUALE: " + temperature + " count " + count);
      temperature += 0.5 ;
      console.log("TEMPERATURA ATTUALE: " + temperature + " count " + count);
      if (count < 5){
        //clearInterval(timeout);
        timeout = setTimeout(temperature_simulation, millis);
      }
    }
    // finestre sono chiuse 
    else {
      console.log("POMPA CALORE ACCESA FINESTRE CHIUSE.. CAMBIA TEMPERATURA...."); 
      count++;
      //temperature += temp_diff_heatpump/5;
      //console.log("TEMPERATURA ATTUALE: " + temperature + " count " + count);
      temperature++;
      console.log("TEMPERATURA ATTUALE: " + temperature + " count " + count);
      if (count < 3){
        //clearInterval(timeout);
        timeout = setTimeout(temperature_simulation, millis);
      }
    }
  }
  // Casi 3 e 4: finestre aperte e pompa calore spenta -> decrescita/crescita fino a temperatura weather service
  else if (window1_open && window2_open && !heatpump_on){
    if (door_open){
      count++;
      temperature += temp_diff_weather/5;
      console.log("TEMPERATURA ATTUALE: " + temperature + " count " + count);
      if (count < 5){
        //clearInterval(timeout);
        timeout = setTimeout(temperature_simulation, millis);
      }
    }
    else {
      count++;
      temperature += temp_diff_weather/3;
      console.log("TEMPERATURA ATTUALE: " + temperature + " count " + count);
      if (count < 3){
        //clearInterval(timeout);
        timeout = setTimeout(temperature_simulation, millis);
      }
    }
  }
  // Casi 5 e 6: una finestra aperta e pompa calore spenta
  else if ((window1_open || window2_open) && !heatpump_on) {
    if (door_open){
      count++;
      temperature += temp_diff_weather/5;
      console.log("TEMPERATURA ATTUALE: " + temperature + " count " + count);
      if (count < 10){
        //clearInterval(timeout);
        timeout = setTimeout(temperature_simulation, millis);
      }
    }
    else {
      count++;
      temperature += temp_diff_weather/3;
      console.log("TEMPERATURA ATTUALE: " + temperature + " count " + count);
      if (count < 6){
        //clearInterval(timeout);
        timeout = setTimeout(temperature_simulation, millis);
      }
    }
  }
  else{
    //clearInterval(timeout);
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
  appBack.post("/status", (request, response) => {
      // Accedi ai dati inviati nel corpo della richiesta POST
      const postData = request.body;
      console.log("Messaggio arrivato");
      console.log(postData);

      if (!postData.find(item => item.type)){
        // Salvataggio lista 
        sensor_properties = postData; 
        //console.log(sensor_properties); 
        count = 0;
        clearTimeout(timeout);

        // Calcolo differenze temperature
        if (sensor_properties.find(item => (item.name == 'weather-service'))){
          var weather_temperature = sensor_properties.find(item => (item.name == 'weather-service'));
          temp_diff_weather = weather_temperature.property - temperature; 
        }
        //var weather_temperature = sensor_properties.find(item => (item.name == 'weather-service'));
        //temp_diff_weather = weather_temperature.property - temperature; 

        //var heatpump_temperature = sensor_properties.find(item => (item.name == 'heat-pump'));
        //temp_diff_heatpump = heatpump_temperature.temp??? - temperature; 

        // Modifichiamo la temperatura interna alla stanza in base a dati ricevuti
        /*const callback = () => {
          this._sendTemperature();
          var timeout = setTimeout(callback, this._someMillis());
        };*/
        console.log("chiamo la funzione temperature simulation");

        // ricontrollare che parta subito
        //temperature_simulation();
        //timeout = setInterval(temperature_simulation, millis);

        timeout = setTimeout(temperature_simulation, 0);

      }
      

      /*
      var tmp = JSON.parse(postData); 
      if (tmp.sensor == "heat-pump" || tmp.sensor == "window-sensor" || tmp.sensor == "door-sensor" || tmp.sensor == "window-sensor_2"){
        if (sensor_properties.some(item => item.sensor == tmp.sensor)){
          sensor_properties = sensor_properties.map(item => item.name == tmp.sensor ? { "name" : item.name, "property" : tmp.action } : item ); 
        }
        else {
          sensor_properties.push({"name" : "weather-service", "property" : 0}); // Di default: temperatura = 0
        }
      }
      */
      

      /*if (postData.action == 'temperature' && postData.degrees != temperature){
        temperature = postData.degrees; 
        console.log('Current temperature: ', temperature);
      }*/
      //response.sendStatus(200);
  });

}

run().then(() => {
  console.info('🏃 Application up and running');
}).catch(err => {
  console.error('💩 Oh shit...', err);
});
