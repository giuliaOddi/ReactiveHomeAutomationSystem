# Heatpump

Il microservizio heatpump-service è stato realizzato per gestire tutti i sensori che rappresentano pompe di calore. Questi sensori sono anch’essi caratterizzati da 3 diversi stati: ON, OFF e ERROR. Anche in questo caso è stato implementato il metodo  _scheduleError(), avente lo stesso funzionamento descritto in window-door, per poter simulare lo stato di errore. 

Le heatpump sono inoltre caratterizzate da una temperatura operativa, che può essere specificata dall’utente nel momento in cui decide di inserire una nuova pompa di calore o che può essere modificata solo nel caso in cui l’heatpump sia accesa.

Questo microservizio accetta tramite REST due diverse tipologie di messaggi: 
* messaggi per il cambio di stato: questi messaggi vengono ricevuti sull’endpoint ‘/change-state’. In questo caso il servizio si occupa di analizzare il messaggio ricevuto ed aggiornare lo stato e/o la temperatura operativa del sensore in questione. 
* messaggi per la rimozione o l’aggiunta di un sensore: questi messaggi sono ricevuti sull’endpoint ‘/add-sensor’. In questo caso la lista viene aggiornata. 
