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

// temperatures in °C 
var temperature = 20;         // default thermometer's temperature 
var temp_diff_weather = 0;    // temperature difference between thermometer and weather service 
var temp_diff_heatpump = 0;   // temperature difference between thermometer and heatmpump sensor  

// possible sensors states 
const ON_OPEN = 1;
const OFF_CLOSE = 0;
const ERROR = -1; 

// possible actions
const ADD = 2;
const REMOVE = 3;

// sensors list with all the properties  
var sensors_properties = []; 

// thermometers list  
export var sensors = [
  { type : 'thermometer', name : 'therm1', state: ON_OPEN, temperature : temperature},
]; 

// milliseconds used to update and save the actual temperature
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
 * Simulate the changing of thermometer's temperature based on states and temperatures of sensors 
 */
function temperature_simulation(){

  // boolean value to know is there is an open window
  var window_open = sensors_properties.find(item => (item.type == 'window' && item.state == ON_OPEN));
  // boolean value to know is there is an open door
  var door_open = sensors_properties.find(item => (item.type == 'door' && item.state == ON_OPEN));
  // boolean value to know is there is an heatpump on 
  var heatpump_on = sensors_properties.find(item => (item.type == 'heatpump' && item.state == ON_OPEN));

  // windows closed and heatpumps off -> the temperature isn't changing
  if (!window_open && !heatpump_on){
    console.log("Windows are closed and heatpumps are off... The temperature isn't changing"); 
  }

  // heatpump on and with an higher temperature -> temperature is changing
  else if (heatpump_on && temp_diff_heatpump > 0){

    // at least one window is open 
    if (window_open){
      console.log("At least one window is open and one heatpump is on... The temperature is increasing"); 
      count++;

      // weather sensor temperature > thermometer temperature 
      if(temp_diff_weather > 0){
        // the temperature converge in 3 times to the max temperature difference between heatpump and weather service
        temperature =  Number((temperature + (max(temp_diff_heatpump, temp_diff_weather)/3)).toFixed(2));  
        // update the current temperature  
        sensors = sensors.map(item => item.temperature !== temperature ? { type : item.type, name : item.name, state : item.state, temperature : temperature } : item ); 
        console.log("Current temperature: ", temperature);
        if (count < 3){
          timeout = setTimeout(temperature_simulation, millis);
        }
      }
      
      // weather sensor temperature < thermometer temperature 
      else {
        // the temperature converge in 8 times to the temperature difference between heatpump and thermometer 
        temperature = Number((temperature + (temp_diff_heatpump/8)).toFixed(2));  
        // update the current temperature  
        sensors = sensors.map(item => item.temperature !== temperature ? { type : item.type, name : item.name, state : item.state, temperature : temperature } : item ); 
        console.log("Current temperature: ", temperature);
        if (count < 8){
          timeout = setTimeout(temperature_simulation, millis);
        }
      }
    }

    // windows are closed 
    else {
      console.log("Windows are closed and at least one heatpump is on... The temperature is increasing");  
      count++;
      // the temperature converge in 5 times to the temperature difference between heatpump and thermometer 
      temperature = Number((temperature + (temp_diff_heatpump/5)).toFixed(2));
      // update the current temperature  
      sensors = sensors.map(item => item.temperature !== temperature ? { type : item.type, name : item.name, state : item.state, temperature : temperature } : item ); 
      console.log("Current temperature: ", temperature);
      if (count < 5){
        timeout = setTimeout(temperature_simulation, millis);
      }
    }
  }

  // at least one window open and heatpump on
  else if (window_open && !heatpump_on){
    console.log("At least one window is open and heatpumps are off... The temperature is changing"); 

    // door open porta aperta 
    if (door_open){
      count++;
      // the temperature converge in 5 times to the temperature difference between weather service and thermometer
      temperature = Number((temperature + (temp_diff_weather/5)).toFixed(2));
      // update the current temperature  
      sensors = sensors.map(item => item.temperature !== temperature ? { type : item.type, name : item.name, state : item.state, temperature : temperature } : item ); 
      console.log("Current temperature: ", temperature);
      if (count < 5){
        timeout = setTimeout(temperature_simulation, millis);
      }
    }

    // door closed 
    else {
      count++;
      // the temperature converge in 5 times to the temperature difference between weather service and thermometer
      temperature = Number((temperature + (temp_diff_weather/3)).toFixed(2));
      // update the current temperature  
      sensors = sensors.map(item => item.temperature !== temperature ? { type : item.type, name : item.name, state : item.state, temperature : temperature } : item ); 
      console.log("Current temperature: ", temperature);
      if (count < 3){
        timeout = setTimeout(temperature_simulation, millis);
      }
    }
  }
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

  // data received from actuator with updated sensors list
  appBack.post("/room_properties", (request, response) => {
      const postData = request.body;

      if (postData.length > 0){
        sensors_properties = postData; 
        count = 0;
        clearTimeout(timeout);

        // calculate temperature difference between thermometer and weather service
        if (sensors_properties.find(item => (item.type == 'weather'))){
          var weather_temperature = sensors_properties.find(item => (item.type == 'weather')).temperature;
          temp_diff_weather = weather_temperature - temperature; 
        }
        // calculate temperature difference between thermometer and heatpump (max temperature)
        if (sensors_properties.find(item => (item.type == 'heatpump'))){
          // find the max temperature of heatpumps 
          var max_temperature = Math.max(...(sensors_properties.filter(item => item.type == 'heatpump' && item.state === ON_OPEN).map(item => item.temperature)));
          temp_diff_heatpump = max_temperature - temperature;
        }        
        timeout = setTimeout(temperature_simulation, 0);
      }
  });

  // data received from actuator to remove a thermometer or add a new one 
  appBack.post("/add-sensor", (request, response) => {
    const postData = request.body;

    // received action: add a new sensor 
    if(postData.action == ADD){
      // update the thermometers list -> adding a new thermometer  
      sensors.push({"type" : postData.sensor_type, "name" : postData.sensor_name, "state" : postData.state, "temperature" : postData.temperature}); 
    }
    // received action: remove an existing sensor 
    else if(postData.action == REMOVE){
      // update the thermometers list -> removing the specific thermometer  
      sensors = sensors.filter( item => item.name !== postData.sensor_name );
    }    
    console.log("Update sensors list: ", sensors);
  });
}

run().then(() => {
  console.info('🏃 Application up and running');
}).catch(err => {
  console.error('💩 Oh shit...', err);
});
