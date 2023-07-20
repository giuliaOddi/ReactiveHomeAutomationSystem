# weather-service

Un μservizio che fornisce la temperatura esterna simulata.

## Installazione

### Requisiti

Per utilizzare questo μservizio serve Node.JS alla version v16.13.0 o successiva.
Potete installare [node manualmente](https://nodejs.org/en/download) oppure, se usate un ambiente Unix, passare
da [NVM](https://github.com/nvm-sh/nvm#install--update-script). NVM è suggerito se avete necessità di utilizzare anche
altre versioni di Node contemporaneamente.

Una volta installato NVM è necessario installare Node da terminale:

```shell
nvm install v16.13.0
```

Da questo momento in poi, ogni volta che si vuole usare Node per il progetto `weather-service` basta aprire un terminale
e lanciare questi comandi:

```shell
cd `path/to/weather-service`
nvm use
```

Il comando `nvm use` permetterà di impostare la versione di Node _in uso in quel terminale_ predefinita per il progetto.
Il comando infatti utilizza la versione indicatanel file `.nvmrc` contenuta in `path/to/weather-service` (in questo caso
la v16.13.0).

### Dipendenze

Per poter eseguire il μservizio è necessario, la prima volta, installare le dipendenze:

```shell
cd path/to/weather-service
npm i
```

Questa operazione va ripetuta se vengono aggiunte altre dipendenze.

## Esecuzione

Per lanciare il server è sufficiente eseguire questo comando:

```shell
node src/server.js
```

Di default il μservizio si metterà in ascolto su tutte le interfacce di rete e quindi potrà essere interrogato all'
indirizzo http://localhost:8000.

È possibile specificare alcune opzioni, come documentato lanciando:

```shell
node src/server.js --help
```

Di seguito vengono descritti i parametri che controllano il comportamento del server, gli errori e i delay:

| Parametro               | Effetto                                                                                                | Valore di default |
|-------------------------|--------------------------------------------------------------------------------------------------------|-------------------|
| -f, --frequency <ms>    | La frequenza di invio (in media) di messaggi della temperatura dal server.                             | 2000              |
| -t, --time-to-live <s>  | I secondi di vita (in media) di una connessione. Se 0 allora la connessione non si interrompe.         | 60                |
| -d, --delay-prob <prob> | La probabilità che si verifichi un ritardo.                                                            | 0.2               |
| -e, --error-prob <prob> | La probabilità che si verifichi un errore.                                                             | 0.1               |
| -F, --no-failures       | Se passato non vengono simulati fallimenti nell'invio dei messaggi e non si interrompe la connessione. |                   |
| -D, --no-delays         | Se passato non vengono simulati ritardi nell'invio dei messaggi.                                       |                   |

Se state facendo delle modifiche al codice e volete ricaricare il server ad ogni modifica potete eseguire questo
comando:

```shell
npm run watch
```

Dietro le quinte verrà utilizzato il tool `nodemon` per monitorare lo stato del codice sorgente e riavviare il server ad
ogni modifica.

## Funzionamento

Il μservizio accetta due tipi di messaggi:

- sottoscrizione
- de-sottoscrizione

È possibile specificare a quale tipo di metrica sottoscriversi ma al momento l'unica implementata è `temperature`.

I messaggi sono sempre di tipo JSON e hanno questa struttura:

```json
{"type": "TIPO", "target": "METRICA"} 
```

dove `TIPO` va sostituito con `subscribe` o `unsubscribe` e `METRICA` va sostituito con `temperature`.

### Esempi

```json lines
{"type": "subscribe", "target": "temperature"}
{"type": "unsubscribe", "target": "temperature"}
```

Una volta che un client si è sottoscritto, il μservizio invia automaticamente, con la frequenza media configurata (di
default 2000ms), dei messaggi riportanti la temperatura:

```json5
{
  "type": "temperature",
  // il tipo di metrica a cui si è sottoscritti
  "dateTime": "2023-04-07T09:53:15.149+02:00",
  // l'instante di tempo a cui il valore fa riferimento
  "value": 17.420443681472605
  // il valore numerico della metrica
}
```

### Malfunzionamenti

Di default il μservizio si comporta in modo anomalo, in particolare:

- salvo diversa configurazione, la connessione col client viene chiusa dopo un periodo casuale di tempo
  inferiore a quello specificato con `--time-to-live`
- perde dei messaggi con probabilità specificata con `--error-prob`
- ritarda l'invio dei messaggi con probabilità specificata con `--delay-prob`

## Interrogazione

Per fare dei test rapidi di interrogazione da terminale potete utilizzare il tool `wscat` (installato quando
avete lanciato `npm i`).

```shell
npm run wscat
```

Lanciato in questo modo, `wscat` si collegherà all'indirizzo http://localhost:8000 e vi permetterà di sottomettere i
messaggi di sottoscrizione o de-sottoscrizione.

`wscat` legge i messaggi da standard input e stampa i messaggi ricevuti su standard output. I messaggi di input vengono
inviati a seguito dell'inserimento del ritorno a capo, quindi è opportuno scrivere i messaggi JSON su una sola riga (
come indicato nei messaggi sopra).

## Implementazione

Questo μservizio è stato implementato utilizzando:

- [Express v4](https://expressjs.com/) come middleware per le API REST (al momento assenti)
- La libreria [WS](https://github.com/websockets/ws) per lo sviluppo del server WebSocket

L'utilizzo di WS è piuttosto semplice ma per agevolare ulteriormente la gestione degli errori e lo scambio dei messaggi
sono stati sviluppati una funzione generica di registrazione degli "handler" `registerHandler` (in `routes.js`) e un "
handler" di esempio `WeatherHandler` in `weather-handler.js`.

L'handler richiede l'implementazione dei metodi `onMessage(msg)`, `stop()` e `start()`. Inoltre, per ragioni di logging,
è necessario implementare il metodo "gettter" di `name`. Ogni handler viene istanziato sulla base di una connessione 
WebSocket instaurata della funzione `registerHandler` e deve estendere la classe `EventEmitter`. Questa classe permette
alla funzione `registerHandler` di mettersi in ascolto dei possibili errori che vengono scatenati in modo asincrono
dall'handler stesso: questi errori devono essere prodotti usando `this.emit('error', ...)`. 

Un generico handler potrebbe essere implementato così:

```javascript
class AnyHandler extends EventEmitter {
  #ws;
  #name;
  
  // il costruttore viene invocato quando la connessione WS è stata instaurata dal client
  constructor(ws, name) {
    super(); // questo statement è obbligatorio dal momento che la classe estende EventEmitter
    this.#ws = ws;
    this.#name = name;
  }
  
  get name() { return this.#name; }
  
  onMessage(msg) {
    // msg è una stringa e può essere interpretata, per esempio, come JSON
    // per inviare messaggi al client occorre usare `ws.send(outMsg)`
    // in questo metodo è opportuno implementare le logiche di gestione dei messaggi
  }
  
  start() {
    // questo metodo viene invocato subito dopo l'istanziazione dell'handler
    // e dopo l'avvenuta registrazione delle callback (si veda `registerHandler`)
    // implementare qui logiche di inizializzazione dell'handler
  }
  
  stop() {
    // questo metodo viene invocato quando si registra un errore a livello di protocollo WebSocket
    // sia quando la connessione viene chiusa dal client in modo graceful
  }
}
```

Una volta implementato l'handler, la registrazione di quest'ultimo e la gestione della connessione WebSocket col client
diviene secondaria se si utilizza `registerHandler`:

```javascript
const handler = new AnyHandler(ws, 'handler-name-xyz');
registerHandler(ws, handler);
```
