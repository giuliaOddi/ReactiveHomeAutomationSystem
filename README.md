# ReactiveHomeAutomationSystem - Giulia Oddi & Luca Taverna

## Progetto di Sistemi Orientati ad Internet - Anno accademico 2022/2023

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

