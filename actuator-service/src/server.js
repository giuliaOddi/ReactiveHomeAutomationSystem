import express from 'express';
import fetch from 'node-fetch';

// Lista sensori e loro stati 
var sensor_properties = []; 

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

    if (postData.name == "window-sensor" || postData.name == "window-sensor_2" || postData.name == "door-sensor" || postData.name == "heat-pump"){
      // me li salvo e quando ricevo temperatura da weather service inoltro la lista
      // AGGIUNGO I DATI RICEVUTI ALLA LISTA 
      if (sensor_properties.some(item => item.name == postData.name)){
        if(postData.name == "heat-pump"){
          sensor_properties = sensor_properties.map(item => item.name == postData.name ? { "name" : item.name, "property" : postData.property, "temperature" : postData.temperature} : item ); 
        }
        else {
          sensor_properties = sensor_properties.map(item => item.name == postData.name ? { "name" : item.name, "property" : postData.property } : item ); 
        }
      }
      else {
        if(postData.name == "heat-pump"){
          sensor_properties.push({"name" : postData.name, "property" : postData.property, "temperature" : postData.temperature }); 
        }
        else {
          sensor_properties.push({"name" : postData.name, "property" : postData.property}); 
        }
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

    else {    
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
      }
      else if(postData.sensor == "window-sensor_2"){

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

        if (sensor_properties.some(item => item.name == 'weather-service')){
          sensor_properties = sensor_properties.map(item => item.name == 'weather-service' ? { "name" : 'weather-service', "property" : postData.degrees } : item ); 
        }
        else {
          sensor_properties.push({"name" : 'weather-service', "property" : postData.degrees}); // Di default: temperatura = 0
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
    }
  });
}

run();