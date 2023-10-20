# Web app

Per permettere le richieste HTTP all’url http://oddi-taverna.soi2223.unipr.it:8080/ e la comunicazione tramite websocket con il backend, è stato modificato il file di configurazione di Apache (my-httpd.conf) inserendo:
```shell
<VirtualHost *:80>
    ServerName oddi-taverna.soi2223.unipr.it
    ServerAlias www.oddi-taverna.soi2223.unipr.it oddi-taverna.soi2223.unipr.it

    ProxyPass     /api/        http://10.88.0.11:8000/
    ProxyPass     /ws      ws://10.88.0.11:7000/
    ProxyPassReverse     /ws       ws://10.88.0.11:7000/
</VirtualHost>
```
Accedendo all’indirizzo http://oddi-taverna.soi2223.unipr.it:8080/, all’utente viene chiesto di effettuare l’autenticazione, che avviene utilizzando OpenID fornito da Google. Per fare ciò, sono state aggiornate le credenziali di Google OAuth e inserite nel file .env : 
```shell
OIDC_CLIENT_ID="851422523733-satu711g8moegjea5rt74n5rlpf59mbn.apps.googleusercontent.com"
OIDC_SECRET="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"
OIDC_REDIRECT="http://oddi-taverna.soi2223.unipr.it:8080"
```
Per il login è quindi necessario un account Google. Inserendo email e password, il frontend comunica tramite REST con il backend per validarle e permettere, tramite l’uso di un token, l’accesso all’applicazione.

Dopo che l’utente è stato autenticato, la web app comunica con il backend tramite le websocket, per ottenere gli aggiornamenti sugli stati dei sensori della stanza ed inoltre per inoltrare i comandi specificati dall’utente tramite interfaccia grafica. In particolare, il frontend si sottoscrive al websocket server del backend reperibile all’indirizzo 10.88.0.11:7000 tramite il messaggio 
``` shell 
{"type": "subscribe", "target": "room_properties"}
```
In questo modo tramite il paradigma publish-subscribe il frontend riceve costantemente aggiornamenti sullo stato della stanza. Il frontend utilizza poi la stessa websocket per inviare i comandi per richiedere un cambio di stato da parte dei sensori.

Lo stato della stanza viene mostrato all’utente tramite una Single Page Application caratterizzata da 4 differenti sezioni:
* Add a new sensor: sezione dedicata all’aggiunta di nuovi sensori. 
* Remove a sensor: sezione dedicata alla rimozione di sensori già esistenti.
* Change sensors states: sezione dedicata ai cambiamenti di stato dei vari sensori
* Charts: read only dashboard contenente i grafici relativi agli stati (in blu) ed alle temperature (in rosso) dei sensori della stanza e del weather-service. 