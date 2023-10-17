'use strict';

import {SensorHandler} from './wss-handler.js';
import {v4 as uuid} from 'uuid';
import fetch from 'node-fetch';


const actuatorAddress = 'http://actuator-service:3000'; 
const endpoint = '/command'; 

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
 * 
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
      var tmp = JSON.parse(data);

      // forwards commands to the actuator
      if (tmp.sensor_type === "door" || tmp.sensor_type === "window" || tmp.sensor_type === "heatpump" || tmp.sensor_type === "thermometer"){

        fetch(actuatorAddress + endpoint, {
          method: 'POST', 
          headers: {
            'Content-Type': 'application/json', 
          },
          body: JSON.stringify(tmp),
        })
        .then((response) => {
          if (response.status == 304){
            console.log("ERROR: can not execute the command");
          }
          if (!response.status) {
            throw new Error('Error with HTTP request: ' + response);
          }
          return response;
        })
        .then((data) => {
          //console.log(data);
        })
        .catch((error) => {
          //console.error(error);
        });
      }
    });
  });
  
}
