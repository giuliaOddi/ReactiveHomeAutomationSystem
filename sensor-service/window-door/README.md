# Window-door 

Pper i sensori di tipo window e di tipo door è stato realizzato un unico microservizio, dato che sono caratterizzati dagli stessi stati. Infatti, le porte e le finestre possono avere 3 differenti stati: OPEN, CLOSE oppure ERROR. 
Lo stato di errore è stato simulato tramite il metodo _scheduleError(), in cui, dopo un numero pseudocasuale di millisecondi, ad un sensore casuale appartenente alla lista viene modificato lo stato. Lo stato può poi essere ripristinato dall’utente tramite interfaccia grafica semplicemente cliccando sul toggle switch relativo al sensore in questione.

Inoltre, questo microservizio accetta tramite REST due diverse tipologie di messaggi: 
* messaggi per il cambio di stato: questi messaggi vengono ricevuti sull’endpoint ‘/change-state’. In questo caso il servizio si occupa di analizzare il messaggio ricevuto ed aggiornare lo stato del sensore in questione. 
* messaggi per la rimozione o l’aggiunta di un sensore: questi messaggi sono ricevuti sull’endpoint ‘/add-sensor’. Anche in questo caso la lista viene aggiornata. 
