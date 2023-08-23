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
        console.log('Dati ricevuti da backend:', postData);

        // attuatore valida le richieste e inoltra quelle valide ai sensori usando backchannel 
        if (postData.sensor == 'door-sensor' ){

          console.log('...inoltro comando a door sensors...');
          // comunication with door
          const doorAddress = 'http://10.88.0.53:3000'; // Indirizzo del tuo server
          const doorEndpoint = '/status'; // Il percorso dell'endpoint desiderato sul server

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
        else if (postData.sensor == 'window-sensor'){

          //// NB CAPIRE COME DIFFERENZIARE FINESTRE ///////  

          console.log('...inoltro comando a window sensors...');
          // backchannel with window sensor 1
          const windowAddress = 'http://10.88.0.50:3000'; // Indirizzo del sensor window
          const endpoint = '/status'; // Il percorso dell'endpoint desiderato sul server

          // Configura la richiesta HTTP POST
          fetch(windowAddress + endpoint, {
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

          // backchannel with window sensor 2
          const windowAddress1 = 'http://10.88.0.51:3000'; // Indirizzo del sensor window
          const endpoint1 = '/status'; // Il percorso dell'endpoint desiderato sul server

          // Configura la richiesta HTTP POST
          fetch(windowAddress1 + endpoint1, {
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
        else if (postData.sensor == 'heat-pump'){

          console.log('...inoltro comando a heat pump sensors...');
          // comunication with heat pump
          const heatpumpAddress = 'http://10.88.0.52:3000'; // Indirizzo del tuo server
          const heatpumpEndpoint = '/status'; // Il percorso dell'endpoint desiderato sul server

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
        else if (postData.sensor == 'thermometer') {

          console.log('...inoltro comando a thermometer sensors...');
          // backchannel with thermometer
          const termAddress = 'http://10.88.0.54:3000'; // Indirizzo del sensor window
          const termEndpoint = '/status'; // Il percorso dell'endpoint desiderato sul server

          // Configura la richiesta HTTP POST
          fetch(termAddress + termEndpoint, {
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
        //response.sendStatus(200);
    });

  }

run();