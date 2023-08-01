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

    // Modifica il metodo da get a post e l'endpoint in "/api/dati"
    app.post("/status", (request, response) => {
        // Accedi ai dati inviati nel corpo della richiesta POST
        const postData = request.body;

        // Puoi eseguire ulteriori operazioni con i dati inviati...
        console.log('Dati ricevuti:', postData);
        response.sendStatus(200);
    });

    // backchannel with sensor
    const serverAddress = 'http://10.88.0.51:3000'; // Indirizzo del tuo server
    const endpoint = '/status'; // Il percorso dell'endpoint desiderato sul server

    // Dati da inviare nel corpo della richiesta POST (in questo esempio un oggetto JSON)
    const postData = {
      action: 'sensorOpen',
      sensor: "door",
    };

    // Configura la richiesta HTTP POST
    fetch(serverAddress + endpoint, {
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

run();