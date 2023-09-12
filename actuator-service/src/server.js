import express from 'express';
import fetch from 'node-fetch';

// Lista sensori e loro stati 
var sensor_properties = [];

const ON_OPEN = 0;
const OFF_CLOSE = 1;

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

    // Riceve nuovi stati dei sensori da backend 
    // me li salvo e quando ricevo temperatura da weather service inoltro la lista
    // AGGIUNGO I DATI RICEVUTI ALLA LISTA 
    // if (sensor_properties.some(item => item.name == postData.name)) {
    //   if (postData.name == "heat-pump") {
    //     sensor_properties = sensor_properties.map(item => item.name == postData.name ? { "name": item.name, "property": postData.property, "temperature": postData.temperature } : item);
    //   }
    //   else {
    //     sensor_properties = sensor_properties.map(item => item.name == postData.name ? { "name": item.name, "property": postData.property } : item);
    //   }
    // }
    // else {
    //   if (postData.name == "heat-pump") {
    //     sensor_properties.push({ "name": postData.name, "property": postData.property, "temperature": postData.temperature });
    //   }
    //   else {
    //     sensor_properties.push({ "name": postData.name, "property": postData.property });
    //   }
    // }

    sensor_properties = postData;
    console.log(sensor_properties);

    console.log('...inoltro comando a thermometer sensors...');
    // backchannel with thermometer
    const termAddress = 'http://10.88.0.54:3000'; // Indirizzo del sensor thermometer
    const termEndpoint = '/status'; // Il percorso dell'endpoint desiderato sul server

    // Configura la richiesta HTTP POST
    fetch(termAddress + termEndpoint, {
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
    if ((postData.sensor_type == 'window' || postData.sensor_type == 'door') && sensor_properties.length > 0) {


      // Ricevo comando == stato attuale del sensore 
      if (sensor_properties.some(item => item.type == postData.sensor_type && item.name == postData.sensor_name && item.state == postData.action)) {
        console.log('...error...');
        response.sendStatus(304);
      }
      // Ricevo comando diverso da stato attuale: posso propagarlo a sensore porta 
      else {
        console.log('...inoltro comando a door sensors...');
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

    }
    else if ((postData.sensor_type == 'heatpump') && sensor_properties.length > 0) {
      // Ricevo comando == stato attuale del sensore 
      if (sensor_properties.some(item => item.type == postData.sensor_type && item.name == postData.sensor_name && item.state == postData.action && item.temperature == postData.temperature)) {
        // errore 
        console.log('...error...');
        response.sendStatus(304);
      }
      else {

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

    }
    else if (postData.sensor_type == 'thermometer' && sensor_properties.length > 0) {

      if (sensor_properties.some(item => item.name == 'weather-service')) {
        sensor_properties = sensor_properties.map(item => item.name == 'weather-service' ? { "name": 'weather-service', "property": postData.degrees } : item);
      }
      else {
        sensor_properties.push({ "name": 'weather-service', "property": postData.degrees }); // Di default: temperatura = 0
      }
      console.log(sensor_properties);

      console.log('...inoltro comando a thermometer sensors...');
      // backchannel with thermometer
      const termAddress = 'http://10.88.0.54:3000'; // Indirizzo del sensor thermometer
      const termEndpoint = '/status'; // Il percorso dell'endpoint desiderato sul server

      // Configura la richiesta HTTP POST
      fetch(termAddress + termEndpoint, {
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
    }
  });
}

run();