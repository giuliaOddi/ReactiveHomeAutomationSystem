# ReactiveHomeAutomationSystem
# Giulia Oddi & Luca Taverna

## Progetto di Sistemi Orientati ad Internet 
## Anno accademico 2022/2023

## Per eseguire l'applicazione
```shell
    docker-compose up --build 
```

## Accedere tramite il link
http://oddi-taverna.soi2223.unipr.it:8080/

## Per rimuovere i container 
```shell
    docker-compose down
```

## P.S:
Bisogna aver modificato il file /etc/hosts (sudo vim /etc/hosts) inserendo l'url corretto

## Esecuzione weather-service
Entrare nella cartella weather-service 
```shell
    nvm use
    node src/server.js
```
Oppure per vedere 
```shell
    nvm use
    npm run watch
```
Per interagire apri altra shell stessa cartella
```shell
    nvm use
    npm run wscat
```
Messaggi:
```shell
    {"type": "subscribe", "target": "temperature"}
    {"type": "unsubscribe", "target": "temperature"}
```

## Per evitare di fare commit
```shell
    git restore <path/nome/file>
```

## Per tornare a commit precedente
```shell
    git log --oneline
    git reset <commitID>
```