# Backend 

Il backend è un’entità che si occupa di inoltrare i messaggi e permettere a tutte le altre componenti di comunicare. In particolare, oltre che a comunicare con il frontend, riceve gli aggiornamenti dei cambi di stato dai vari sensori, sotto forma di lista, tramite l’implementazione del paradigma publish-subscribe. 

Quindi, gestisce le comunicazioni:
* si sottoscrive tramite il messaggio {"type": "subscribe", "target": "temperature"} alla WS API esposta dal microservizio weather-service tramite  ws://weather-service:5000; 
* si sottoscrive tramite il messaggio {"type": "subscribe", "target": "window-door", "list": null} alla WS API esposta dal microservizio window-door tramite ws://window-door:4000;
* si sottoscrive tramite il messaggio {"type": "subscribe", "target": "heatpump", "list": null} alla WS API esposta dal microservizio heatpump tramite ws://heatpump-service:4000; 
* si sottoscrive tramite il messaggio {"type": "subscribe", "target": "thermometer_temperature", "list": null} alla WS API esposta dal microservizio thermometer tramite ws://thermometer-service:4000. 

Tramite il campo "list" nel messaggio di subscribe il backend può inviare ad un microservizio (window-door, heatpump, thermometer) appena riavviato la lista aggiornata dei sensori di cui si occupa, in questo modo il microservizio riesce a recuperare il suo stato prima di essere stato interrotto.
Ogni volta che il backend riceve un aggiornamento da queste API, ricerca all’interno della lista ricevuta i cambiamenti di stato e/o temperatura e gli eventuali sensori rimossi per aggiornare la lista sensors_properties in memoria. Dopodiché, la lista aggiornata viene inoltrata all’attuatore tramite REST all’indirizzo http://actuator-service:3000/sensor_properties.

Inoltre, il backend mantiene anche una comunicazione attiva con il frontend. Ogni volta che la lista sensors_properties viene aggiornata, il backend la invia al frontend sottoscritto alla sua WS API.

Infine, il backend si occupa anche di propagare i comandi ricevuti dalla web app all’attuatore, tramite REST all’indirizzo http://actuator-service:3000/command. 
