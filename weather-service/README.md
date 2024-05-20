# Weather-service

Il weather service è un microservizio che simula il cambiamento della temperatura all’esterno della stanza. Dopo che il backend ha inviato un messaggio di sottoscrizione 
```shell
{"type": "subscribe", "target": "temperature"}
```

il weather-service invia periodicamente la nuova temperatura tramite websocket al backend. \
Il messaggio utilizzato per inviare gli aggiornamenti è il seguente: 
```shell
msg = {type: 'temperature', dateTime: DateTime.now().toISO(), value};
```

Anche per il weather service è stato simulato lo spegnimento del container tramite l’utilizzo del metodo *_scheduleDeath()*, in cui viene generato casualmente il tempo per cui il container resterà attivo prima di chiamare *process.exit()*. 
