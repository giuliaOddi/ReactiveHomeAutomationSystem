'use strict';

import {SensorHandler} from './wss-handler.js';
import {v4 as uuid} from 'uuid';
import fetch from 'node-fetch';

// comunicazione con actuator
const actuatorAddress = 'http://10.88.0.41:3000'; // Indirizzo del tuo server
const endpoint = '/command'; // Il percorso dell'endpoint desiderato sul server

/**
 * Registers a new handler for the WS channel.
 * @param ws {WebSocket} The WebSocket client
 * @param handler {WeatherHandler} The WebSocket handler
 */
function registerHandler(ws, handler) {

  const removeAllListeners = () => {
    ws.removeListener('handler', handlerCb);
    ws.removeListener('ping', pingCb);
    ws.removeListener('close', closeCb);
    ws.removeListener('error', errorCb);
  };

  function pingCb() {
    console.trace('🏐 Ping-Pong', {handler:handler.name},);
    ws.pong();
  }

  function handlerCb(msg) {
    try {
      handler.onMessage(msg);
    } catch (e) {
      console.error('💢 Unexpected error while handling inbound message', {handler:handler.name}, e);
    }
  }

  function closeCb() {
    console.info('⛔ WebSocket closed', {handler:handler.name},);
    handler.stop();
    removeAllListeners();
  }

  function errorCb(err) {
    console.error('💥 Error occurred', {handler:handler.name}, err);
    handler.stop();
    removeAllListeners();
    ws.close();
  }

  ws.on('message', handlerCb);
  ws.on('ping', pingCb);
  ws.on('close', closeCb);
  ws.on('error', errorCb);

  handler.on('error', (err) => {
    errorCb(err);
  });

  // starts the handler
  handler.start();
}

/**
 * Initializes routes.
 * @param {Express} app Express application
 * @param {WebSocketServer} wss WebSocket server
 * @param {{iface: string, port: number}} config Configuration options
 */
export function routesWss(wss, config) {

  wss.on('connection', ws => {
    try {
      const handler = new SensorHandler(ws, config, `sensor:${uuid()}`);
      registerHandler(ws, handler);
    } catch (e) {
      console.error('💥 Failed to register handler, closing connection', e);
      ws.close();
    }
    ws.on('message', function message(data) {
      console.log('received: %s', data);
          // Invio comando per porta

      var tmp = JSON.parse(data);

      console.log(tmp);
      if (tmp.sensor_type == "door" || tmp.sensor_type == "window"){
        fetch(actuatorAddress + endpoint, {
          method: 'POST', // Metodo della richiesta
          headers: {
            'Content-Type': 'application/json', // Specifica che i dati inviati sono in formato JSON
          },
          body: JSON.stringify(tmp), // Converti i dati in formato JSON e inseriscili nel corpo della richiesta
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
      }
    
    });
  });
  
}
