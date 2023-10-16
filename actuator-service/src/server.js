import express from 'express';
import fetch from 'node-fetch';

// sensors list containing their state
var sensor_properties = [];

// sensors states
const ON_OPEN = 1;
const OFF_CLOSE = 0;
const ERROR = -1;

// remove and add sensors
const ADD = 2;
const REMOVE = 3;

async function run() {

  // receiving data from backend
  const app = express();
  app.use(express.json());

  const port = 3000;

  app.listen(port, () => {
    console.log("Server Listening on PORT:", port);
  });

  app.post("/sensor_properties", (request, response) => {

    const postData = request.body;
    sensor_properties = postData;
    console.log(sensor_properties);

    // backchannel with thermometer
    const thermAddress = 'http://thermometer-service:3000'; 
    const thermEndpoint = '/room_properties'; 

    fetch(thermAddress + thermEndpoint, {
      method: 'POST', 
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(sensor_properties), 
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

  // receives commands from users and sends them to sensors
  app.post("/command", (request, response) => {
    const postData = request.body;
    console.log(postData);

    // if command refers to window_door sensors
    if ((postData.sensor_type == 'window' || postData.sensor_type == 'door')) {
      
      // not_valid_command == true if the user tries to set a state equal to the current one
      var not_valid_command = sensor_properties.some(item => item.type == postData.sensor_type && item.name == postData.sensor_name && item.state == postData.action); 
      if (sensor_properties.length > 0 && not_valid_command) {
        console.log("ERROR: can not execute the command: " + postData);
        response.sendStatus(304);
      }

      // if valid command -> changing states
      else if (postData.action == OFF_CLOSE || postData.action == ON_OPEN) {

        // communication with window_door sensors
        const windowDoorAddress = 'http://window-door:3000'; 
        const windowDoorEndpoint = '/change-state'; 

        fetch(windowDoorAddress + windowDoorEndpoint, {
          method: 'POST', 
          headers: {
            'Content-Type': 'application/json', 
          },
          body: JSON.stringify(postData), 
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

      // if valid command -> adding or removing sensors
      else if (postData.action == ADD || postData.action == REMOVE){

        // comunication with window_door
        const windowDoorAddress = 'http://window-door:3000'; 
        const windowDoorEndpoint = '/add-sensor'; 

        fetch(windowDoorAddress + windowDoorEndpoint, {
          method: 'POST', 
          headers: {
            'Content-Type': 'application/json', 
          },
          body: JSON.stringify(postData), 
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
    }

    // if command refers to heatpump sensors
    else if ((postData.sensor_type == 'heatpump')) {

      // not_valid_command == true if the user tries to set a state equal to the current one
      var not_valid_command = sensor_properties.some(item => item.type == postData.sensor_type && item.name == postData.sensor_name && item.state == postData.action && item.temperature == postData.temperature); 
      
      if (sensor_properties.length > 0 && not_valid_command) {
        // errore 
        console.log("ERROR: can not execute the command: " + postData);
        response.sendStatus(304);
      }
      
      // if valid command -> changing states
      else if (postData.action == OFF_CLOSE || postData.action == ON_OPEN) {

        // communication with heatpump
        const heatpumpAddress = 'http://heatpump-service:3000'; 
        const heatpumpEndpoint = '/change-state'; 

        fetch(heatpumpAddress + heatpumpEndpoint, {
          method: 'POST', // Metodo della richiesta
          headers: {
            'Content-Type': 'application/json', 
          },
          body: JSON.stringify(postData), 
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

      // if valid command -> adding or removing sensors
      else if (postData.action == ADD || postData.action == REMOVE){

        // communication with heatpump
        const heatpumpAddress = 'http://heatpump-service:3000'; 
        const heatpumpEndpoint = '/add-sensor'; 

        fetch(heatpumpAddress + heatpumpEndpoint, {
          method: 'POST', 
          headers: {
            'Content-Type': 'application/json', 
          },
          body: JSON.stringify(postData), 
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
    }

    // if command refers to thermometer sensors
    else if (postData.sensor_type == 'thermometer' && (postData.action == ADD || postData.action == REMOVE)){
     
      // communication with thermometer
      const thermAddress = 'http://thermometer-service:3000';
      const thermEndpoint = '/add-sensor'; 

      fetch(thermAddress + thermEndpoint, {
        method: 'POST', 
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(postData), 
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

run();