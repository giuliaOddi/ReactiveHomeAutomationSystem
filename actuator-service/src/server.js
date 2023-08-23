import express from 'express';
import fetch from 'node-fetch';

async function run() {

    // receiving data from backend
    const app = express();
    app.use(express.json());

    const port = 3000;

    app.listen(port, () => {
        console.log("Server Listening on PORT:", port);
    });

    app.post("/status", (request, response) => {
        // Accedi ai dati inviati nel corpo della richiesta POST
        const postData = request.body;

        // Puoi eseguire ulteriori operazioni con i dati inviati...
        console.log('Dati ricevuti:', postData);
        response.sendStatus(200);
    });

    // Dati da inviare nel corpo della richiesta POST (in questo esempio un oggetto JSON)
    const openDoor = {
      action: 'open',
      sensor: "door-sensor",
    };

    const closeWindow = {
      action: 'close',
      sensor: "window-sensor",
    };

    const offHeatPump = {
      action: 'off',
      sensor: "heat-pump",
    };

    // backchannel with sensor
    const windowAddress = 'http://10.88.0.51:3000'; // Indirizzo del sensor window
    const endpoint = '/status'; // Il percorso dell'endpoint desiderato sul server

    // Configura la richiesta HTTP POST
    fetch(windowAddress + endpoint, {
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

    // comunication with heat pump
    const heatpumpAddress = 'http://10.88.0.52:3000'; // Indirizzo del tuo server
    const heatpumpEndpoint = '/status'; // Il percorso dell'endpoint desiderato sul server

    // Configura la richiesta HTTP POST
    fetch(heatpumpAddress + heatpumpEndpoint, {
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


    // comunication with door
    const doorAddress = 'http://10.88.0.53:3000'; // Indirizzo del tuo server
    const doorEndpoint = '/status'; // Il percorso dell'endpoint desiderato sul server

    // Configura la richiesta HTTP POST
    fetch(doorAddress + doorEndpoint, {
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

  }

run();