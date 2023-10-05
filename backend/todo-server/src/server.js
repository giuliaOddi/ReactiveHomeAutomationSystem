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
const sensor_properties_endpoint = '/sensor_properties'; // Il percorso dell'endpoint desiderato sul server
const command_endpoint = '/command'; // Il percorso dell'endpoint desiderato sul server


// Lista sensori e loro stati 
export var sensors_properties = []; 

// Stati sensori
const ON_OPEN = 1;
const OFF_CLOSE = 0;
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
    ws_weather.send('{"type": "subscribe", "target": "temperature"}');
  });
  
  ws_weather.on('message', function message(data) {
    count++;

    // Ricevo temperatura da wheater service 
    console.log('received: %s', data);

    var tmp = JSON.parse(data); 

    if (tmp.type == "temperature"){
      if (sensors_properties.length == 0){
        sensors_properties = [{ type : "weather", name : "weather", state : ON_OPEN, temperature : Number((tmp.value).toFixed(2)) }, ];
      }
      else{
        if (sensors_properties.find(item => item.type === 'weather')){
          // Aggiornamento proprietà weather 
          sensors_properties = sensors_properties.map(item => item.type === 'weather' ? { type : item.type, name : item.name, state : item.state, temperature : Number((tmp.value).toFixed(3)) }: item); 
        }
        else {
          // Aggiunta weather 
          sensors_properties.push({ type : "weather", name : "weather", state : ON_OPEN, temperature : Number((tmp.value).toFixed(2)) }); 
        }
      }    
      console.log(sensors_properties); 

      // Invio comando per cambio temperature
      fetch(actuatorAddress + sensor_properties_endpoint, {
        method: 'POST', // Metodo della richiesta
        headers: {
          'Content-Type': 'application/json', // Specifica che i dati inviati sono in formato JSON
        },
        body: JSON.stringify(sensors_properties), // Converti i dati in formato JSON e inseriscili nel corpo della richiesta
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

      /*
      if (count == 10){
          ws_weather.send('{"type": "unsubscribe", "target": "temperature"}');
      }
      */
    }
  });
}

function connect_to_window_sensor(){
  // comunicazione con window sensor service
  let ws_window = new WebSocket('ws://10.88.0.50:4000');
  let count = 0;

  ws_window.on('error', err => {
    console.log("Error connecting to the window door...");
    console.log("Trying to reconnect to the window door...");
    ws_window = null;
    setTimeout(connect_to_window_sensor, 1000);
  });

  ws_window.on('open', function open() {
    console.log("Successfully connected to the window door...");
    ws_window.send('{"type": "subscribe", "target": "window-door"}');
  });
  
  ws_window.on('message', function message(data) {
    count++;
    console.log('received: %s', data);
    var tmp = JSON.parse(data); 

    // {type: 'sensors_list', dateTime: DateTime.now().toISO(), list : sensors};
    if (tmp.type == "sensors_list"){
      if (sensors_properties.length == 0){
        sensors_properties = tmp.list;
      }
      else{
        sensors_properties = sensors_properties.map( item => {
          let item2  = tmp.list.find(item2 => (item2.type === item.type && item2.name === item.name)); 
          if (item2) {
            if (item2.type === 'heatpump' || item2.type === 'thermometer' || item2.type === 'weather') { return  { "type" : item.type, "name" : item.name, "state" : item2.state, "temperature" : item2.temperature }; }
            else { return  { "type" : item.type, "name" : item.name, "state" : item2.state }; }
          }
          else{ 
            return item;
          }
        });

        tmp.list.map(item => (sensors_properties.find(item2 => (item2.type === item.type && item2.name === item.name) ) ? null : item))
                .filter(item => item!== null)
                .forEach(item => sensors_properties.push(item));
        // rimozione

        var sensors_to_remove = sensors_properties.map(item => (tmp.list.find(item2 => item2.name === item.name )) ? null : item )
          .filter(item => item !== null && (item.type === "window" || item.type === "door"));

        sensors_properties = sensors_properties.map( item =>( sensors_to_remove.find(item2 => item2.name === item.name )) ? null : item )
          .filter(item => item!= null);
      }
      
      console.log(sensors_properties);
      // Inoltro stato ad attuatore
      fetch(actuatorAddress + sensor_properties_endpoint, {
        method: 'POST', // Metodo della richiesta
        headers: {
          'Content-Type': 'application/json', // Specifica che i dati inviati sono in formato JSON
        },
        body: JSON.stringify(sensors_properties),
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
    /*
    if (count == 5){
        ws_window.send('{"type": "unsubscribe", "target": "window-door"}');
    }
    */
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
    ws_heat.send('{"type": "subscribe", "target": "heatpump"}');
  });
  
  ws_heat.on('message', function message(data) {
    count3++;
    console.log('received: %s', data);
    var tmp = JSON.parse(data); 

    if (tmp.type == "sensors_list"){
      if (sensors_properties.length == 0){
        sensors_properties = tmp.list;
      }
      else{
        sensors_properties = sensors_properties.map( item => {
          let item2  = tmp.list.find(item2 => (item2.type === item.type && item2.name === item.name)); 
          if (item2) {
            if (item2.type === 'heatpump' || item2.type === 'thermometer' || item2.type === 'weather') { return  { "type" : item.type, "name" : item.name, "state" : item2.state, "temperature" : item2.temperature }; }
            else { return  { "type" : item.type, "name" : item.name, "state" : item2.state }; }
          }
          else{ 
            return item;
          }
        });

        tmp.list.map(item => (sensors_properties.find(item2 => (item2.type === item.type && item2.name === item.name) ) ? null : item))
                .filter(item => item!== null)
                .forEach(item => sensors_properties.push(item));

        var sensors_to_remove = sensors_properties.map(item => (tmp.list.find(item2 => item2.name === item.name )) ? null : item )
          .filter(item => item !== null && item.type === "heatpump");

        sensors_properties = sensors_properties.map( item =>( sensors_to_remove.find(item2 => item2.name === item.name )) ? null : item )
          .filter(item => item!= null);
      }


      fetch(actuatorAddress + sensor_properties_endpoint, {
        method: 'POST', // Metodo della richiesta
        headers: {
          'Content-Type': 'application/json', // Specifica che i dati inviati sono in formato JSON
        },
        body: JSON.stringify(sensors_properties), 
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
    console.log(sensors_properties); 
    /*
    if (count3 == 20){
      ws_heat.send('{"type": "unsubscribe", "target": "heatpump"}');
    }*/
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
    ws_therm.send('{"type": "subscribe", "target": "thermometer_temperature"}');
  });
  
  ws_therm.on('message', function message(data) {
    count_therm++;
    console.log('received: %s', data);
    var tmp = JSON.parse(data); 
    if (tmp.type == "sensors_list"){
      if (sensors_properties.length == 0){
        sensors_properties = tmp.list;
      }
      else{
        // Aggiornamento proprietà sensori 
        sensors_properties = sensors_properties.map( item => {
          let item2  = tmp.list.find(item2 => (item2.type === item.type && item2.name === item.name)); 
          if (item2) {
            if (item2.type === 'heatpump' || item2.type === 'thermometer' || item2.type === 'weather') { return  { "type" : item.type, "name" : item.name, "state" : item2.state, "temperature" : item2.temperature }; }
            else { return  { "type" : item.type, "name" : item.name, "state" : item2.state }; }
          }
          else{ 
            return item;
          }
        });
        // Aggiunta elementi alla lista
        tmp.list.map(item => (sensors_properties.find(item2 => (item2.type === item.type && item2.name === item.name) ) ? null : item))
                .filter(item => item!== null)
                .forEach(item => sensors_properties.push(item));

        // Rimozione sensori non presenti nella lista che mi è arrivata
        var sensors_to_remove = sensors_properties.map(item => (tmp.list.find(item2 => (item2.type === item.type && item2.name === item.name))) ? null : item )
          .filter(item => item !== null && item.type === "thermometer");

        sensors_properties = sensors_properties.map( item =>( sensors_to_remove.find(item2 => item2.name === item.name )) ? null : item )
          .filter(item => item!= null);
      }
    }
    console.log(sensors_properties);
    /*
    if (count_therm == 15){
      ws_therm.send('{"type": "unsubscribe", "target": "thermometer_temperature"}');
    }*/
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

    connect_to_heat_pump();

    connect_to_thermometer_sensor();

    // Backend invia comandi all'attuatore 

    ////// NB SARA' UN FORWARD DEI COMANDI DATI DA WEB APP //////

    

    // const closeWindow = {
    //   action: OFF_CLOSE,
    //   sensor: 'window-sensor',
    // };

    // const closeWindow2 = {
    //   action: OFF_CLOSE,
    //   sensor: 'window-sensor_2',
    // };

    // const offHeatPump = {
    //   action: ON_OPEN,
    //   sensor: 'heat-pump',
    // };
    

    // // Invio comando per porta
    // fetch(actuatorAddress + endpoint, {
    //   method: 'POST', // Metodo della richiesta
    //   headers: {
    //     'Content-Type': 'application/json', // Specifica che i dati inviati sono in formato JSON
    //   },
    //   body: JSON.stringify(openDoor), // Converti i dati in formato JSON e inseriscili nel corpo della richiesta
    // })
    // .then((response) => {
    //   if (response.status == 304){
    //     console.log("ERROR: can not execute the command");
    //   }
    //   if (!response.status) {
    //     throw new Error('Errore nella richiesta HTTP: ' + response);
    //   }
    //   return response; 
    // })
    // .then((data) => {
    //   // Usa i dati ottenuti dalla risposta
    //   //console.log('Risposta POST ricevuta:', data);
    // })
    // .catch((error) => {
    //   console.error('Si è verificato un errore:', error);
    // });

    // // Invio comando per finestra
    // fetch(actuatorAddress + endpoint, {
    //   method: 'POST', // Metodo della richiesta
    //   headers: {
    //     'Content-Type': 'application/json', // Specifica che i dati inviati sono in formato JSON
    //   },
    //   body: JSON.stringify(closeWindow), // Converti i dati in formato JSON e inseriscili nel corpo della richiesta
    // })
    // .then((response) => {
    //   if (response.status == 304){
    //     console.log("ERROR: can not execute the command");
    //   }
    //   if (!response.status) {
    //     throw new Error('Errore nella richiesta HTTP: ' + response);
    //   }
    //   return response; 
    // })
    // .then((data) => {
    //   // Usa i dati ottenuti dalla risposta
    //   //console.log('Risposta POST ricevuta:', data);
    // })
    // .catch((error) => {
    //   console.error('Si è verificato un errore:', error);
    // });

    //  // Invio comando per finestra2
    //  fetch(actuatorAddress + endpoint, {
    //   method: 'POST', // Metodo della richiesta
    //   headers: {
    //     'Content-Type': 'application/json', // Specifica che i dati inviati sono in formato JSON
    //   },
    //   body: JSON.stringify(closeWindow2), // Converti i dati in formato JSON e inseriscili nel corpo della richiesta
    // })
    // .then((response) => {
    //   if (response.status == 304){
    //     console.log("ERROR: can not execute the command");
    //   }
    //   if (!response.status) {
    //     throw new Error('Errore nella richiesta HTTP: ' + response);
    //   }
    //   return response; 
    // })
    // .then((data) => {
    //   // Usa i dati ottenuti dalla risposta
    //   console.log('Risposta POST ricevuta:');
    // })
    // .catch((error) => {
    //   console.error('Si è verificato un errore:', error);
    // });

    // // Invio comando per la pompa di calore 
    // fetch(actuatorAddress + endpoint, {
    //   method: 'POST', // Metodo della richiesta
    //   headers: {
    //     'Content-Type': 'application/json', // Specifica che i dati inviati sono in formato JSON
    //   },
    //   body: JSON.stringify(offHeatPump), // Converti i dati in formato JSON e inseriscili nel corpo della richiesta
    // })
    // .then((response) => {
    //   if (response.status == 304){
    //     console.log("ERROR: can not execute the command");
    //   }
    //   if (!response.status) {
    //     throw new Error('Errore nella richiesta HTTP: ' + response);
    //   }
    //   return response; 
    // })
    // .then((data) => {
    //   // Usa i dati ottenuti dalla risposta
    //   //console.log('Risposta POST ricevuta:', data.response.response);
    // })
    // .catch((error) => {
    //   console.error('Si è verificato un errore:', error);
    // });

    
}

// noinspection JSIgnoredPromiseFromCall
run();
