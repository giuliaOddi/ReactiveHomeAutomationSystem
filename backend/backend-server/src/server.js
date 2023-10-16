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

// communication with actuator
const actuatorAddress = 'http://actuator-service:3000'; 
const sensor_properties_endpoint = '/sensor_properties'; 
const command_endpoint = '/command'; 


// sensors list with their states
export var sensors_properties = []; 

// sensors states
const ON_OPEN = 1;
const OFF_CLOSE = 0;
const ERROR = -1; 

var timeout_weather;

var first_heatpump_connection = false;
var timeout_heatpump;

var first_windowdoor_connection = false;
var timeout_windowdoor;
var first_thermometer_connection = false;
var timeout_thermometer;

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


function connect_to_weather_service(){
  // communication with weather service
  let ws_weather = new WebSocket('ws://weather-service:5000');

  ws_weather.on('error', err => {
    console.log("Error connecting to the weather service ...");
    console.log("Trying to reconnect to the weather service...");
    ws_weather = null;
    clearTimeout(timeout_weather);
    timeout_weather = setTimeout(connect_to_weather_service, 1000);
  });

  ws_weather.on('open', function open() {
    console.log("Successfully connected to weather service...");
    ws_weather.send('{"type": "subscribe", "target": "temperature"}');
  });

  ws_weather.on('close', err => {
    console.log("Connection to the weather service closed...");
    console.log("Trying to reconnect to the weather service...");
    ws_weather = null;
    clearTimeout(timeout_weather);
    timeout_weather = setTimeout(connect_to_weather_service, 1000);
  });
  
  ws_weather.on('message', function message(data) {

    // receives temperatures from weather
    console.log('received: %s', data);

    var tmp = JSON.parse(data); 

    if (tmp.type == "temperature"){
      if (sensors_properties.length == 0){
        // initializes the sensors_properties list
        sensors_properties = [{ type : "weather", name : "weather", state : ON_OPEN, temperature : Number((tmp.value).toFixed(2)) }, ];
      }
      else{
        if (sensors_properties.find(item => item.type === 'weather')){
          // updates sensors_properties weather entry
          sensors_properties = sensors_properties.map(item => item.type === 'weather' ? { type : item.type, name : item.name, state : item.state, temperature : Number((tmp.value).toFixed(2)) }: item); 
        }
        else {
          // creates weather entry in the sensors_properties list
          sensors_properties.push({ type : "weather", name : "weather", state : ON_OPEN, temperature : Number((tmp.value).toFixed(2)) }); 
        }
      }    
      console.log(sensors_properties); 

      // forwards the list to the actuator
      fetch(actuatorAddress + sensor_properties_endpoint, {
        method: 'POST', 
        headers: {
          'Content-Type': 'application/json', 
        },
        body: JSON.stringify(sensors_properties), 
      })
      .then((response) => {
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
}

function connect_to_window_door_sensor(){
  // communication with window_door sensor
  let ws_window_door = new WebSocket('ws://window-door:4000');

  ws_window_door.on('error', err => {
    console.log("Error connecting to the window door...");
    console.log("Trying to reconnect to the window door...");
    ws_window_door = null;
    clearTimeout(timeout_windowdoor);
    timeout_windowdoor = setTimeout(connect_to_window_door_sensor, 1000);
  });

  ws_window_door.on('open', function open() {
    console.log("Successfully connected to the window door...");
    if (!first_windowdoor_connection){
      ws_window_door.send('{"type": "subscribe", "target": "window-door", "list":' +  null + '}');
      first_windowdoor_connection = true;
    }
    else {
      var window_door_sensors = sensors_properties.filter(item => (item.type === "window" || item.type === "door"));
      ws_window_door.send('{"type": "subscribe", "target": "window-door", "list": ' + JSON.stringify(window_door_sensors) + '}'); 
    }
  });

  ws_window_door.on('close', err => {
    console.log("Connection to the window door closed...");
    console.log("Trying to reconnect to the window door...");
    ws_window_door = null;
    clearTimeout(timeout_windowdoor);
    timeout_windowdoor = setTimeout(connect_to_window_door_sensor, 1000);
  });
  
  ws_window_door.on('message', function message(data) {
    console.log('received: %s', data);
    var tmp = JSON.parse(data); 

    
    if (tmp.type == "sensors_list"){
      if (sensors_properties.length == 0){
        // initializes the sensors_properties list
        sensors_properties = tmp.list;
      }
      else{

        // changes the entries on the sensors_properties list 
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

        // updates the entries for new sensors
        tmp.list.map(item => (sensors_properties.find(item2 => (item2.type === item.type && item2.name === item.name) ) ? null : item))
                .filter(item => item!== null)
                .forEach(item => sensors_properties.push(item)); // pushes the sensors into the list
        
        // removes the sensors that the user deleted
        var sensors_to_remove = sensors_properties.map(item => (tmp.list.find(item2 => item2.name === item.name )) ? null : item )
          .filter(item => item !== null && (item.type === "window" || item.type === "door"));

        sensors_properties = sensors_properties.map( item =>( sensors_to_remove.find(item2 => item2.name === item.name )) ? null : item )
          .filter(item => item!= null);
      }
      
      console.log(sensors_properties);

      // forwards the list to the actuator
      fetch(actuatorAddress + sensor_properties_endpoint, {
        method: 'POST', 
        headers: {
          'Content-Type': 'application/json', 
        },
        body: JSON.stringify(sensors_properties), 
      })
      .then((response) => {
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
}

function connect_to_heatpump(){
  // communication with heatpump sensor 
  let ws_heatpump = new WebSocket('ws://heatpump-service:4000');

  ws_heatpump.on('error', err => {
    console.log("Error connecting to the heat pump...");
    console.log("Trying to reconnect to the heat pump...");
    ws_heatpump = null;
    clearTimeout(timeout_heatpump);
    timeout_heatpump = setTimeout(connect_to_heatpump, 1000);
  });

  ws_heatpump.on('open', function open() {
    console.log("Successfully connected to the heat pump...");
    if (!first_heatpump_connection){
      ws_heatpump.send('{"type": "subscribe", "target": "heatpump", "list":' +  null + '}');
      first_heatpump_connection = true;
    }
    else {
      var heatpump_sensors = sensors_properties.filter(item => item.type === "heatpump");
      ws_heatpump.send('{"type": "subscribe", "target": "heatpump", "list": ' + JSON.stringify(heatpump_sensors) + '}'); 
    }
  });

  ws_heatpump.on('close', err => {
    console.log("Connection to the heatpump closed...");
    console.log("Trying to reconnect to the heatpump...");
    ws_heatpump = null;
    clearTimeout(timeout_heatpump);
    timeout_heatpump = setTimeout(connect_to_heatpump, 1000);
  });
  
  ws_heatpump.on('message', function message(data) {
    console.log('received: %s', data);
    var tmp = JSON.parse(data); 

    if (tmp.type == "sensors_list"){
      if (sensors_properties.length == 0){
        // initializes the list
        sensors_properties = tmp.list;
      }
      else{
        // updates the entries on the sensors_properties list 
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

        // creates the entries for new sensors
        tmp.list.map(item => (sensors_properties.find(item2 => (item2.type === item.type && item2.name === item.name) ) ? null : item))
                .filter(item => item!== null)
                .forEach(item => sensors_properties.push(item));  // pushes the sensor into the list

        // removes the sensors that the user deleted
        var sensors_to_remove = sensors_properties.map(item => (tmp.list.find(item2 => item2.name === item.name )) ? null : item )
          .filter(item => item !== null && item.type === "heatpump");

        sensors_properties = sensors_properties.map( item =>( sensors_to_remove.find(item2 => item2.name === item.name )) ? null : item )
          .filter(item => item!= null);
      }

      console.log(sensors_properties); 

      // forwards the list to the actuator
      fetch(actuatorAddress + sensor_properties_endpoint, {
        method: 'POST', 
        headers: {
          'Content-Type': 'application/json', 
        },
        body: JSON.stringify(sensors_properties), 
      })
      .then((response) => {
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
}

function connect_to_thermometer(){
  // communication with thermometer sensor 
  let ws_thermometer = new WebSocket('ws://thermometer-service:4000');

  ws_thermometer.on('error', err => {
    console.log("Error connecting to the thermometer sensor...");
    console.log("Trying to reconnect to the thermometer sensor...");
    ws_thermometer = null;
    clearTimeout(timeout_thermometer);
    timeout_thermometer = setTimeout(connect_to_thermometer, 1000);
  });

  ws_thermometer.on('open', function open() {
    console.log("Successfully connected to the thermometer sensor...");
    if (!first_thermometer_connection){
      ws_thermometer.send('{"type": "subscribe", "target": "thermometer_temperature", "list":' +  null + '}');
      first_thermometer_connection = true;
    }
    else {
      var thermometer_sensors = sensors_properties.filter(item => item.type === "thermometer");
      ws_thermometer.send('{"type": "subscribe", "target": "thermometer_temperature", "list": ' + JSON.stringify(thermometer_sensors) + '}'); 
    }
  });

  ws_thermometer.on('close', err => {
    console.log("Connection to the thermometer closed...");
    console.log("Trying to reconnect to the thermometer...");
    ws_thermometer = null;
    clearTimeout(timeout_thermometer);
    timeout_thermometer = setTimeout(connect_to_thermometer, 1000);
  });
  
  ws_thermometer.on('message', function message(data) {
    console.log('received: %s', data);
    var tmp = JSON.parse(data); 
    if (tmp.type == "sensors_list"){
      if (sensors_properties.length == 0){
        // initializes the sensors_properties list
        sensors_properties = tmp.list;
      }
      else{
        // updates the entries on the sensors_properties list 
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
       
        // creates the entries for new sensors
        tmp.list.map(item => (sensors_properties.find(item2 => (item2.type === item.type && item2.name === item.name) ) ? null : item))
                .filter(item => item!== null)
                .forEach(item => sensors_properties.push(item));

        // removes the sensors that the user deleted
        var sensors_to_remove = sensors_properties.map(item => (tmp.list.find(item2 => (item2.type === item.type && item2.name === item.name))) ? null : item )
          .filter(item => item !== null && item.type === "thermometer");

        sensors_properties = sensors_properties.map( item =>( sensors_to_remove.find(item2 => item2.name === item.name )) ? null : item )
          .filter(item => item!= null);
      }
    }
    console.log(sensors_properties);
    
    // forwards the list to the actuator
    fetch(actuatorAddress + sensor_properties_endpoint, {
      method: 'POST', 
      headers: {
        'Content-Type': 'application/json', 
      },
      body: JSON.stringify(sensors_properties), 
    })
    .then((response) => {
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
  });
}

async function run() {
    
    var config = {
      iface: "0.0.0.0",
      port: 7000,
      failures: false,
      delays: false,
      frequency: 2000
    }

    const wss = new WebSocketServer({ port: config.port });
    routesWss(wss, config);

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
        console.info(`🏁 Server listening: http://${iface}:${port}`);
    });


    // functions that starts web socket communications with sensors and weather service

    connect_to_weather_service();

    connect_to_window_door_sensor();

    connect_to_heatpump();

    connect_to_thermometer();
}


run();
