'use strict';

import util from 'util';

// utilities
import {v4 as uuid} from 'uuid';

// express
import express from 'express';
import methodOverride from 'method-override';
import bodyParser from 'body-parser';
import compression from 'compression';

// own modules
import opts from './options.js';
import {routes} from './routes.js';
import {OIDCMiddleware} from './openid.js';
import {WebSocketServer} from 'ws';

import {routesWss} from './routes-wss.js';

import {WebSocket} from 'ws';

import fetch from 'node-fetch';
import { connect } from 'http2';

// comunicazione con actuator
const actuatorAddress = 'http://10.88.0.41:3000'; // Indirizzo del tuo server
const endpoint = '/status'; // Il percorso dell'endpoint desiderato sul server

// Lista sensori e loro stati 
var sensor_properties = []; 

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
        res.set('X-Request-ID', req.id);
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


function connect_to_weather_service(){
  // comunicazione con weather service
  let ws_weather = new WebSocket('ws://10.88.0.31:5000');
  let count = 0;

  ws_weather.on('error', err => {
    console.log("Error connecting to the weather service ...");
    console.log("Trying to reconnect to the weather service...");
    ws_weather = null;
    setTimeout(connect_to_weather_service, 1000);
  });

  ws_weather.on('open', function open() {
    console.log("Successfully connected to weather service...");
    // Salvataggio weather service nella lista delle proprietà 
    sensor_properties.push({"name" : "weather-service", "property" : 0}); // Di default: temperatura = 0 
    console.log(sensor_properties); 
    ws_weather.send('{"type": "subscribe", "target": "temperature"}');
  });
  
  ws_weather.on('message', function message(data) {
    count++;

    // Ricevo temperatura da wheater service 
    console.log('received: %s', data);

    var tmp = JSON.parse(data); 
    if (tmp.type == "temperature"){
      sensor_properties = sensor_properties.map(item => item.name == "weather-service" ? { "name" : item.name, "property" : tmp.value } : item ); 
    
      console.log(sensor_properties); 

      // Inoltro temperatura a termometro 
      const setTemperature = {
        action: 'temperature',
        sensor: 'thermometer',
        degrees: tmp.value, 
      };

      // Invio comando per cambio temperature
      fetch(actuatorAddress + endpoint, {
        method: 'POST', // Metodo della richiesta
        headers: {
          'Content-Type': 'application/json', // Specifica che i dati inviati sono in formato JSON
        },
        body: JSON.stringify(setTemperature), // Converti i dati in formato JSON e inseriscili nel corpo della richiesta
      })
      .then((response) => {
        if (!response.status) {
          throw new Error('Errore nella richiesta HTTP: ' + response);
        }
        return response; 
      })
      .then((data) => {
        // Usa i dati ottenuti dalla risposta
        console.log('Risposta POST ricevuta:');
      })
      .catch((error) => {
        console.error('Si è verificato un errore:', error);
      });

      if (count == 5){
          ws_weather.send('{"type": "unsubscribe", "target": "temperature"}');
      }
    }
  });
}

function connect_to_window_sensor(){
  // comunicazione con window sensor service
  let ws_window = new WebSocket('ws://10.88.0.50:4000');
  let count2 = 0;

  ws_window.on('error', err => {
    console.log("Error connecting to the window sensor...");
    console.log("Trying to reconnect to the window sensor...");
    ws_window = null;
    setTimeout(connect_to_window_sensor, 1000);
  });

  ws_window.on('open', function open() {
    console.log("Successfully connected to the window sensor...");
    // Salvataggio window sensor nella lista delle proprietà 
    sensor_properties.push({"name" : "window-sensor", "property" : ON_OPEN}); // Di default: state = CLOSE 
    ///// NB DOBBIAMO DIFFERENZIARE LE WINDOW E LA PORTA ANCHE QUI... COME??? ////////
    ws_window.send('{"type": "subscribe", "target": "state_window"}');
  });
  
  ws_window.on('message', function message(data) {
    count2++;
    console.log('received: %s', data);
    var tmp = JSON.parse(data); 
    if (tmp.type == "state_window"){
      sensor_properties = sensor_properties.map(item => item.name == "window-sensor" ? { "name" : item.name, "property" : tmp.state } : item ); 

      // Inoltro stato ad attuatore
      fetch(actuatorAddress + endpoint, {
        method: 'POST', // Metodo della richiesta
        headers: {
          'Content-Type': 'application/json', // Specifica che i dati inviati sono in formato JSON
        },
        body: JSON.stringify({"name" : "window-sensor", "property" : tmp.state}), // Converti i dati in formato JSON e inseriscili nel corpo della richiesta
      })
      .then((response) => {
        if (!response.status) {
          throw new Error('Errore nella richiesta HTTP: ' + response);
        }
        return response; 
      })
      .then((data) => {
        // Usa i dati ottenuti dalla risposta
        console.log('Risposta POST ricevuta:');
      })
      .catch((error) => {
        console.error('Si è verificato un errore:', error);
      });

    }
    console.log(sensor_properties); 
    if (count2 == 5){
        ws_window.send('{"type": "unsubscribe", "target": "state_window"}');
    }
  });
}

function connect_to_window_sensor_2(){
  // comunicazione con window sensor 2 service
  let ws_window_2 = new WebSocket('ws://10.88.0.51:4000');
  let count_2 = 0;

  ws_window_2.on('error', err => {
    console.log("Error connecting to the window sensor 2...");
    console.log("Trying to reconnect to the window sensor 2...");
    ws_window_2 = null;
    setTimeout(connect_to_window_sensor_2, 1000);
  });

  ws_window_2.on('open', function open() {
    console.log("Successfully connected to the window sensor 2...");
    // Salvataggio window sensor nella lista delle proprietà 
    sensor_properties.push({"name" : "window-sensor_2", "property" : ON_OPEN}); // Di default: state = CLOSE
    ws_window_2.send('{"type": "subscribe", "target": "state_window"}');
  });
  
  ws_window_2.on('message', function message(data) {
    count_2++;
    console.log('received: %s', data);
    var tmp = JSON.parse(data); 
    if (tmp.type == "state_window"){
      sensor_properties = sensor_properties.map(item => item.name == "window-sensor_2" ? { "name" : item.name, "property" : tmp.state } : item ); 

      // Inoltro stato ad attuatore
      fetch(actuatorAddress + endpoint, {
        method: 'POST', // Metodo della richiesta
        headers: {
          'Content-Type': 'application/json', // Specifica che i dati inviati sono in formato JSON
        },
        body: JSON.stringify({"name" : "window-sensor_2", "property" : tmp.state}), // Converti i dati in formato JSON e inseriscili nel corpo della richiesta
      })
      .then((response) => {
        if (!response.status) {
          throw new Error('Errore nella richiesta HTTP: ' + response);
        }
        return response; 
      })
      .then((data) => {
        // Usa i dati ottenuti dalla risposta
        console.log('Risposta POST ricevuta:');
      })
      .catch((error) => {
        console.error('Si è verificato un errore:', error);
      });

    }
    console.log(sensor_properties); 
    if (count_2 == 5){
      ws_window_2.send('{"type": "unsubscribe", "target": "state_window"}');
    }
  });
}

function connect_to_heat_pump(){
  // comunicazione con heat pump sensor service
  let ws_heat = new WebSocket('ws://10.88.0.52:4000');
  let count3 = 0;

  ws_heat.on('error', err => {
    console.log("Error connecting to the heat pump...");
    console.log("Trying to reconnect to the heat pump...");
    ws_heat = null;
    setTimeout(connect_to_heat_pump, 1000);
  });

  ws_heat.on('open', function open() {
    console.log("Successfully connected to the heat pump...");
    // Salvataggio heat pump sensor nella lista delle proprietà 
    sensor_properties.push({"name" : "heat-pump", "property" : OFF_CLOSE, "temperature" : 0}); // Di default: state = OFF
    ws_heat.send('{"type": "subscribe", "target": "state_heatpump"}');
  });
  
  ws_heat.on('message', function message(data) {
    count3++;
    console.log('received: %s', data);
    var tmp = JSON.parse(data); 
    if (tmp.type == "state_heatpump"){
      sensor_properties = sensor_properties.map(item => item.name == "heat-pump" ? { "name" : item.name, "property" : tmp.state, "temperature" : tmp.temperature} : item ); 
      // Inoltro stato ad attuatore
      fetch(actuatorAddress + endpoint, {
        method: 'POST', // Metodo della richiesta
        headers: {
          'Content-Type': 'application/json', // Specifica che i dati inviati sono in formato JSON
        },
        body: JSON.stringify({"name" : "heat-pump", "property" : tmp.state, "temperature" : tmp.temperature}), // Converti i dati in formato JSON e inseriscili nel corpo della richiesta
      })
      .then((response) => {
        if (!response.status) {
          throw new Error('Errore nella richiesta HTTP: ' + response);
        }
        return response; 
      })
      .then((data) => {
        // Usa i dati ottenuti dalla risposta
        console.log('Risposta POST ricevuta:');
      })
      .catch((error) => {
        console.error('Si è verificato un errore:', error);
      });

    }
    console.log(sensor_properties); 
    if (count3 == 5){
      ws_heat.send('{"type": "unsubscribe", "target": "state_heatpump"}');
    }
  });
}

function connect_to_door_sensor(){
  // comunicazione con door sensor service
  //////// NB: POSSIAMO METTERE DOOR CON INDIRIZZO = 53 COME VARIABILE ///////////
  let ws_door = new WebSocket('ws://10.88.0.53:4000');
  let count_door = 0;

  ws_door.on('error', err => {
    console.log("Error connecting to the door sensor...");
    console.log("Trying to reconnect to the door sensor...");
    ws_door = null;
    setTimeout(connect_to_door_sensor, 1000);
  });

  ws_door.on('open', function open() {
    console.log("Successfully connected the door sensor...");
    // Salvataggio door sensor nella lista delle proprietà 
    sensor_properties.push({"name" : "door-sensor", "property" : OFF_CLOSE}); // Di default: state = CLOSE
    ws_door.send('{"type": "subscribe", "target": "state_window"}');
  });
  
  ws_door.on('message', function message(data) {
    count_door++;
    console.log('received: %s', data);
    var tmp = JSON.parse(data); 
    if (tmp.type == "state_window"){
      sensor_properties = sensor_properties.map(item => item.name == "door-sensor" ? { "name" : item.name, "property" : tmp.state } : item ); 
      // Inoltro stato ad attuatore
      fetch(actuatorAddress + endpoint, {
        method: 'POST', // Metodo della richiesta
        headers: {
          'Content-Type': 'application/json', // Specifica che i dati inviati sono in formato JSON
        },
        body: JSON.stringify({"name" : "door-sensor", "property" : tmp.state}), // Converti i dati in formato JSON e inseriscili nel corpo della richiesta
      })
      .then((response) => {
        if (!response.status) {
          throw new Error('Errore nella richiesta HTTP: ' + response);
        }
        return response; 
      })
      .then((data) => {
        // Usa i dati ottenuti dalla risposta
        console.log('Risposta POST ricevuta:');
      })
      .catch((error) => {
        console.error('Si è verificato un errore:', error);
      });

    }
    console.log(sensor_properties);
    if (count_door == 5){
      ws_door.send('{"type": "unsubscribe", "target": "state_window"}');
    }
  });
}

function connect_to_thermometer_sensor(){
  // comunicazione con thermometer sensor service
  let ws_therm = new WebSocket('ws://10.88.0.54:4000');
  let count_therm = 0;

  ws_therm.on('error', err => {
    console.log("Error connecting to the thermometer sensor...");
    console.log("Trying to reconnect to the thermometer sensor...");
    ws_therm = null;
    setTimeout(connect_to_thermometer_sensor, 1000);
  });

  ws_therm.on('open', function open() {
    console.log("Successfully connected to the thermometer sensor...");
    // Salvataggio thermometer sensor nella lista delle proprietà 
    sensor_properties.push({"name" : "thermometer-sensor", "property" : 0}); // Di default: temperature = 0
    ws_therm.send('{"type": "subscribe", "target": "thermometer_temperature"}');
  });
  
  ws_therm.on('message', function message(data) {
    count_therm++;
    console.log('received: %s', data);
    var tmp = JSON.parse(data); 
    if (tmp.type == "thermometer_temperature"){
      sensor_properties = sensor_properties.map(item => item.name == "thermometer-sensor" ? { "name" : item.name, "property" : tmp.temperature } : item ); 
    }
    console.log(sensor_properties);
    if (count_therm == 15){
      ws_therm.send('{"type": "unsubscribe", "target": "thermometer_temperature"}');
    }
  });
}

async function run() {

    // comunicazione con frontend
    //const appFront = express();
    //init(appFront);

    
    var config = {
      iface: "0.0.0.0",
      port: 7000,
      failures: false,
      delays: false,
      frequency: 2000
    }

    /*
    const serverFront = appFront.listen(config.iface, config.port, () => {
      console.info(`🏁 Server listening: http://${config.iface}:${config.port}`);
    })*/

    //const wss = initWss(serverFront);
    const wss = new WebSocketServer({ port: config.port });
    routesWss(wss, config);
    //fallbacks(appFront);

    // creates the configuration options and the logger
    const options = opts();
    console.debug('🔧 Configuration', options);

    console.debug(`🔧 Initializing OpenID Connect...`);
    const oidc = new OIDCMiddleware(options.config.oidc);
    await oidc.init();

    console.debug(`🔧 Initializing routes...`);

    const app = express();
    init(app);
    routes(app, oidc, options.config);
    fallbacks(app);

    const {iface, port} = options.config;
    app.listen(port, iface, () => {
        // noinspection HttpUrlsUsage
        console.info(`🏁 Server listening: http://${iface}:${port}`);
    });

    
    connect_to_weather_service();

    connect_to_window_sensor();

    connect_to_window_sensor_2();

    connect_to_heat_pump();

    connect_to_door_sensor();

    connect_to_thermometer_sensor();

    // Backend invia comandi all'attuatore 

    ////// NB SARA' UN FORWARD DEI COMANDI DATI DA WEB APP //////

    // Dati da inviare nel corpo della richiesta POST (in questo esempio un oggetto JSON)
    const openDoor = {
      action: ON_OPEN,
      sensor: 'door-sensor',
    };

    const closeWindow = {
      action: OFF_CLOSE,
      sensor: 'window-sensor',
    };

    const closeWindow2 = {
      action: OFF_CLOSE,
      sensor: 'window-sensor_2',
    };

    const offHeatPump = {
      action: ON_OPEN,
      sensor: 'heat-pump',
    };
    

    // Invio comando per porta
    fetch(actuatorAddress + endpoint, {
      method: 'POST', // Metodo della richiesta
      headers: {
        'Content-Type': 'application/json', // Specifica che i dati inviati sono in formato JSON
      },
      body: JSON.stringify(openDoor), // Converti i dati in formato JSON e inseriscili nel corpo della richiesta
    })
    .then((response) => {
      if (response.status == 304){
        console.log("ERROR: can not execute the command");
      }
      if (!response.status) {
        throw new Error('Errore nella richiesta HTTP: ' + response);
      }
      return response; 
    })
    .then((data) => {
      // Usa i dati ottenuti dalla risposta
      //console.log('Risposta POST ricevuta:', data);
    })
    .catch((error) => {
      console.error('Si è verificato un errore:', error);
    });

    // Invio comando per finestra
    fetch(actuatorAddress + endpoint, {
      method: 'POST', // Metodo della richiesta
      headers: {
        'Content-Type': 'application/json', // Specifica che i dati inviati sono in formato JSON
      },
      body: JSON.stringify(closeWindow), // Converti i dati in formato JSON e inseriscili nel corpo della richiesta
    })
    .then((response) => {
      if (response.status == 304){
        console.log("ERROR: can not execute the command");
      }
      if (!response.status) {
        throw new Error('Errore nella richiesta HTTP: ' + response);
      }
      return response; 
    })
    .then((data) => {
      // Usa i dati ottenuti dalla risposta
      //console.log('Risposta POST ricevuta:', data);
    })
    .catch((error) => {
      console.error('Si è verificato un errore:', error);
    });

     // Invio comando per finestra2
     fetch(actuatorAddress + endpoint, {
      method: 'POST', // Metodo della richiesta
      headers: {
        'Content-Type': 'application/json', // Specifica che i dati inviati sono in formato JSON
      },
      body: JSON.stringify(closeWindow2), // Converti i dati in formato JSON e inseriscili nel corpo della richiesta
    })
    .then((response) => {
      if (response.status == 304){
        console.log("ERROR: can not execute the command");
      }
      if (!response.status) {
        throw new Error('Errore nella richiesta HTTP: ' + response);
      }
      return response; 
    })
    .then((data) => {
      // Usa i dati ottenuti dalla risposta
      console.log('Risposta POST ricevuta:');
    })
    .catch((error) => {
      console.error('Si è verificato un errore:', error);
    });

    // Invio comando per la pompa di calore 
    fetch(actuatorAddress + endpoint, {
      method: 'POST', // Metodo della richiesta
      headers: {
        'Content-Type': 'application/json', // Specifica che i dati inviati sono in formato JSON
      },
      body: JSON.stringify(offHeatPump), // Converti i dati in formato JSON e inseriscili nel corpo della richiesta
    })
    .then((response) => {
      if (response.status == 304){
        console.log("ERROR: can not execute the command");
      }
      if (!response.status) {
        throw new Error('Errore nella richiesta HTTP: ' + response);
      }
      return response; 
    })
    .then((data) => {
      // Usa i dati ottenuti dalla risposta
      //console.log('Risposta POST ricevuta:', data.response.response);
    })
    .catch((error) => {
      console.error('Si è verificato un errore:', error);
    });

    
}

// noinspection JSIgnoredPromiseFromCall
run();
