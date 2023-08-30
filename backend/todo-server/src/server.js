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

import {WebSocket} from 'ws';

import fetch from 'node-fetch';


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
    // creates the configuration options and the logger
    const options = opts();
    console.debug('🔧 Configuration', options);

    console.debug(`🔧 Initializing OpenID Connect...`);
    const oidc = new OIDCMiddleware(options.config.oidc);
    await oidc.init();

    console.debug(`🔧 Initializing routes...`);

    // comunicazione con weather service
    const ws = new WebSocket('ws://10.88.0.31:5000');
    let count = 0;

    ws.on('error', console.error);

    ws.on('open', function open() {
      // Salvataggio weather service nella lista delle proprietà 
      sensor_properties.push({"name" : "weather-service", "property" : 0}); // Di default: temperatura = 0 
      console.log(sensor_properties); 
      ws.send('{"type": "subscribe", "target": "temperature"}');
    });
    
    ws.on('message', function message(data) {
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
            ws.send('{"type": "unsubscribe", "target": "temperature"}');
        }
      }
    });

    // comunicazione con window sensor service
    const ws_sensor = new WebSocket('ws://10.88.0.50:4000');
    let count2 = 0;

    ws_sensor.on('error', console.error);

    ws_sensor.on('open', function open() {
      // Salvataggio window sensor nella lista delle proprietà 
      sensor_properties.push({"name" : "window-sensor", "property" : OFF_CLOSE}); // Di default: state = CLOSE 
      ///// NB DOBBIAMO DIFFERENZIARE LE WINDOW E LA PORTA ANCHE QUI... COME??? ////////
      ws_sensor.send('{"type": "subscribe", "target": "state_window"}');
    });
    
    ws_sensor.on('message', function message(data) {
      count2++;
      console.log('received: %s', data);
      var tmp = JSON.parse(data); 
      if (tmp.type == "state_window"){
        sensor_properties = sensor_properties.map(item => item.name == "window-sensor" ? { "name" : item.name, "property" : tmp.state } : item ); 
      }
      console.log(sensor_properties); 
      if (count2 == 5){
          ws_sensor.send('{"type": "unsubscribe", "target": "state_window"}');
      }
    });

    // comunicazione con window sensor 2 service
    const ws_sensor_2 = new WebSocket('ws://10.88.0.51:4000');
    let count_2 = 0;

    ws_sensor_2.on('error', console.error); 

    ws_sensor_2.on('open', function open() {
      // Salvataggio window sensor nella lista delle proprietà 
      sensor_properties.push({"name" : "window-sensor_2", "property" : OFF_CLOSE}); // Di default: state = CLOSE
      ws_sensor_2.send('{"type": "subscribe", "target": "state_window"}');
    });
    
    ws_sensor_2.on('message', function message(data) {
      count_2++;
      console.log('received: %s', data);
      var tmp = JSON.parse(data); 
      if (tmp.type == "state_window"){
        sensor_properties = sensor_properties.map(item => item.name == "window-sensor_2" ? { "name" : item.name, "property" : tmp.state } : item ); 
      }
      console.log(sensor_properties); 
      if (count_2 == 5){
        ws_sensor_2.send('{"type": "unsubscribe", "target": "state_window"}');
      }
    });

    // comunicazione con heat pump sensor service
    const ws_heat = new WebSocket('ws://10.88.0.52:4000');
    let count3 = 0;

    ws_heat.on('error', console.error);

    ws_heat.on('open', function open() {
      // Salvataggio heat pump sensor nella lista delle proprietà 
      sensor_properties.push({"name" : "heat-pump", "property" : OFF_CLOSE}); // Di default: state = OFF
      ws_heat.send('{"type": "subscribe", "target": "state_heatpump"}');
    });
    
    ws_heat.on('message', function message(data) {
      count3++;
      console.log('received: %s', data);
      var tmp = JSON.parse(data); 
      if (tmp.type == "state_heatpump"){
        sensor_properties = sensor_properties.map(item => item.name == "heat-pump" ? { "name" : item.name, "property" : tmp.state } : item ); 
      }
      console.log(sensor_properties); 
      if (count3 == 5){
        ws_heat.send('{"type": "unsubscribe", "target": "state_heatpump"}');
      }
    });

    // comunicazione con door sensor service
    //////// NB: POSSIAMO METTERE DOOR CON INDIRIZZO = 53 COME VARIABILE ///////////
    const ws_door = new WebSocket('ws://10.88.0.53:4000');
    let count_door = 0;

    ws_door.on('error', console.error);

    ws_door.on('open', function open() {
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
      }
      console.log(sensor_properties);
      if (count_door == 5){
        ws_door.send('{"type": "unsubscribe", "target": "state_window"}');
      }
    });

    // comunicazione con thermometer sensor service
    const ws_therm = new WebSocket('ws://10.88.0.54:4000');
    let count_therm = 0;

    ws_therm.on('error', console.error);

    ws_therm.on('open', function open() {
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
      if (count_therm == 5){
        ws_therm.send('{"type": "unsubscribe", "target": "thermometer_temperature"}');
      }
    });

    const app = express();
    init(app);
    routes(app, oidc, options.config);
    fallbacks(app);

    const {iface, port} = options.config;
    app.listen(port, iface, () => {
        // noinspection HttpUrlsUsage
        console.info(`🏁 Server listening: http://${iface}:${port}`);
    });

    // comunicazione con actuator
    const actuatorAddress = 'http://10.88.0.41:3000'; // Indirizzo del tuo server
    const endpoint = '/status'; // Il percorso dell'endpoint desiderato sul server

    // Backend invia comandi all'attuatore 

    ////// NB SARA' UN FORWARD DEI COMANDI DATI DA WEB APP //////

    // Dati da inviare nel corpo della richiesta POST (in questo esempio un oggetto JSON)
    const openDoor = {
      action: 'open',
      sensor: 'door-sensor',
    };

    const closeWindow = {
      action: 'close',
      sensor: 'window-sensor',
    };

    const offHeatPump = {
      action: 'off',
      sensor: 'heat-pump',
    };

    // Invio comando per aprire la porta
    fetch(actuatorAddress + endpoint, {
      method: 'POST', // Metodo della richiesta
      headers: {
        'Content-Type': 'application/json', // Specifica che i dati inviati sono in formato JSON
      },
      body: JSON.stringify(openDoor), // Converti i dati in formato JSON e inseriscili nel corpo della richiesta
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

    // Invio comando per chiudere la finestra
    fetch(actuatorAddress + endpoint, {
      method: 'POST', // Metodo della richiesta
      headers: {
        'Content-Type': 'application/json', // Specifica che i dati inviati sono in formato JSON
      },
      body: JSON.stringify(closeWindow), // Converti i dati in formato JSON e inseriscili nel corpo della richiesta
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

    // Invio comando per spegnere la pompa di calore 
    fetch(actuatorAddress + endpoint, {
      method: 'POST', // Metodo della richiesta
      headers: {
        'Content-Type': 'application/json', // Specifica che i dati inviati sono in formato JSON
      },
      body: JSON.stringify(offHeatPump), // Converti i dati in formato JSON e inseriscili nel corpo della richiesta
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

// noinspection JSIgnoredPromiseFromCall
run();
