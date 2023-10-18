# ReactiveHomeAutomationSystem - Giulia Oddi & Luca Taverna

## Progetto di Sistemi Orientati ad Internet - Anno accademico 2022/2023
Il progetto ha avuto come obiettivo lo sviluppo di un sistema che effettui la simulazione di una singola stanza automatizzata caratterizzata dalla presenza di alcuni sensori. Le varie componenti del sistema sono realizzate come microservizi e vengono eseguite in container Docker. 

Le componenti sono:
* Web-app: fornisce una interfaccia utente per monitorare e modificare lo stato della stanza;
* Backend: permette il dialogo tra il frontend ed i vari sensori, propagando i comandi degli utenti all’attuatore e ricevendo gli stati aggiornati dai vari sensori, che verranno poi mostrati all’utente tramite web-app;
* Attuatore: riceve dal backend lo stato aggiornato del sistema ed i comandi inseriti dall’utente e ne controlla la validità;
* Weather-service: microservizio che periodicamente invia al backend una temperatura che simula quella esterna;
* Window-door: definisce il comportamento dei sensori porte e dei sensori finestre che possono essere aperte, chiuse o in stato di errore;
* Heatpump: definisce il comportamento dei sensori pompa di calore che può essere accesa, spenta o in stato di errore e la temperatura a cui deve operare;
* Thermometer: definisce il comportamento del sensore termometro, che simula il cambiamento dI temperatura nella stanza in base agli stati degli altri sensori;  

## Per eseguire l'applicazione
Scaricare la cartella: 
```shell
    git clone https://github.com/giuliaOddi/ReactiveHomeAutomationSystem.git
```
```shell
    cd ReactiveHomeAutomationSystem
```
```shell
    docker-compose up --build 
```

Accedere tramite il link (utilizzando il browser Firefox):

http://oddi-taverna.soi2223.unipr.it:8080/

N.B: per effettuare l'accesso all'applicazione web è necessario autenticarsi tramite un account Google.

#### Per rimuovere i container:
```shell
    docker-compose down --remove-orphans
```

### Attenzione!
Bisogna aver modificato il file /etc/hosts (sudo vim /etc/hosts) inserendo: 
```shell
    127.0.0.1       oddi-taverna.soi2223.unipr.it www.oddi-taverna.soi2223.unipr.it
```

