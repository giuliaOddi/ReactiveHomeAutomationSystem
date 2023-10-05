import express from 'express';
import fetch from 'node-fetch';

// Lista sensori e loro stati 
var sensor_properties = [];

const ON_OPEN = 1;
const OFF_CLOSE = 0;
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
    // Accedi ai dati inviati nel corpo della richiesta POST
    const postData = request.body;

    // Puoi eseguire ulteriori operazioni con i dati inviati...
    console.log('Dati ricevuti da backend:', postData);

    sensor_properties = postData;
    console.log(sensor_properties);

    console.log('...inoltro comando a thermometer sensors...');
    // backchannel with thermometer
    const thermAddress = 'http://10.88.0.54:3000'; // Indirizzo del sensor thermometer
    const thermEndpoint = '/room_properties'; 

    // Configura la richiesta HTTP POST
    fetch(thermAddress + thermEndpoint, {
      method: 'POST', // Metodo della richiesta
      headers: {
        'Content-Type': 'application/json', // Specifica che i dati inviati sono in formato JSON
      },
      body: JSON.stringify(sensor_properties), // Converti i dati in formato JSON e inseriscili nel corpo della richiesta
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
  });

  app.post("/command", (request, response) => {
    // Accedi ai dati inviati nel corpo della richiesta POST
    const postData = request.body;
    console.log(postData);
    // Riceve azioni da propagare ai sensori 
    // attuatore valida le richieste e inoltra quelle valide ai sensori usando backchannel 
    if ((postData.sensor_type == 'window' || postData.sensor_type == 'door')) {
      var not_valid_command = sensor_properties.some(item => item.type == postData.sensor_type && item.name == postData.sensor_name && item.state == postData.action); 
      // Ricevo comando == stato attuale del sensore 
      if (sensor_properties.length > 0 && not_valid_command) {
        console.log('...error...');
        response.sendStatus(304);
      }
      // Ricevo comando diverso da stato attuale: posso propagarlo a sensore porta 
      else if (postData.action == OFF_CLOSE || postData.action == ON_OPEN) {
        // comunication with door
        const doorAddress = 'http://10.88.0.50:3000'; // Indirizzo del tuo server
        const doorEndpoint = '/change-state'; // Il percorso dell'endpoint desiderato sul server

        // Configura la richiesta HTTP POST
        fetch(doorAddress + doorEndpoint, {
          method: 'POST', // Metodo della richiesta
          headers: {
            'Content-Type': 'application/json', // Specifica che i dati inviati sono in formato JSON
          },
          body: JSON.stringify(postData), // Converti i dati in formato JSON e inseriscili nel corpo della richiesta
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
      else if (postData.action == ADD || postData.action == REMOVE){
        console.log('...inoltro comando a door sensors...');
        // comunication with door
        const doorAddress = 'http://10.88.0.50:3000'; // Indirizzo del tuo server
        const doorEndpoint = '/add-sensor'; // Il percorso dell'endpoint desiderato sul server

        // Configura la richiesta HTTP POST
        fetch(doorAddress + doorEndpoint, {
          method: 'POST', // Metodo della richiesta
          headers: {
            'Content-Type': 'application/json', // Specifica che i dati inviati sono in formato JSON
          },
          body: JSON.stringify(postData), // Converti i dati in formato JSON e inseriscili nel corpo della richiesta
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
    }
    else if ((postData.sensor_type == 'heatpump')) {
      var not_valid_command = sensor_properties.some(item => item.type == postData.sensor_type && item.name == postData.sensor_name && item.state == postData.action && item.temperature == postData.temperature); 
      // Ricevo comando == stato attuale del sensore 
      if (sensor_properties.length > 0 && not_valid_command) {
        // errore 
        console.log('...error...');
        response.sendStatus(304);
      }
      else if (postData.action == OFF_CLOSE || postData.action == ON_OPEN) {
        console.log('...inoltro comando a heat pump sensors...');
        // comunication with heat pump
        const heatpumpAddress = 'http://10.88.0.52:3000'; // Indirizzo del tuo server
        const heatpumpEndpoint = '/change-state'; // Il percorso dell'endpoint desiderato sul server

        // Configura la richiesta HTTP POST
        fetch(heatpumpAddress + heatpumpEndpoint, {
          method: 'POST', // Metodo della richiesta
          headers: {
            'Content-Type': 'application/json', // Specifica che i dati inviati sono in formato JSON
          },
          body: JSON.stringify(postData), // Converti i dati in formato JSON e inseriscili nel corpo della richiesta
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
      else if (postData.action == ADD || postData.action == REMOVE){
        // comunication with door
        const heatpumpAddress = 'http://10.88.0.52:3000'; // Indirizzo del tuo server
        const heatpumpEndpoint = '/add-sensor'; // Il percorso dell'endpoint desiderato sul server

        // Configura la richiesta HTTP POST
        fetch(heatpumpAddress + heatpumpEndpoint, {
          method: 'POST', // Metodo della richiesta
          headers: {
            'Content-Type': 'application/json', // Specifica che i dati inviati sono in formato JSON
          },
          body: JSON.stringify(postData), // Converti i dati in formato JSON e inseriscili nel corpo della richiesta
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
    }
    else if (postData.sensor_type == 'thermometer' && (postData.action == ADD || postData.action == REMOVE)){
      console.log("Ricevuto: " , postData); 
      // comunication with door
      const thermAddress = 'http://10.88.0.54:3000'; // Indirizzo del sensor thermometer
      const thermEndpoint = '/add-sensor'; // Il percorso dell'endpoint desiderato sul server

      // Configura la richiesta HTTP POST
      fetch(thermAddress + thermEndpoint, {
        method: 'POST', // Metodo della richiesta
        headers: {
          'Content-Type': 'application/json', // Specifica che i dati inviati sono in formato JSON
        },
        body: JSON.stringify(postData), // Converti i dati in formato JSON e inseriscili nel corpo della richiesta
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
  });
}

run();