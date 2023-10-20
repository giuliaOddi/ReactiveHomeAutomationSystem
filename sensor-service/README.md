# Sensori

Per la gestione dei sensori presenti nella stanza, sono stati realizzati 3 differenti container: window-door, heatpump-service e thermometer-service. In particolare, ogni container si occupa di tenere in memoria le proprietà di sensori dello stesso tipo, grazie all’utilizzo di una lista. 

Si è scelto di unire i sensori di tipo door e di tipo window, perché essi sono caratterizzati dagli stessi stati (OPEN, CLOSE e ERROR) e quindi anche dallo stesso comportamento. 

Ogni sensore implementa il pattern publish-subscribe, tramite una WS API, per inviare aggiornamenti al backend. Periodicamente viene controllato se la lista delle proprietà dei sensori ha subito cambiamenti ed, in questo caso, viene inviata al backend tramite il messaggio:
```shell
msg = {type: 'sensors_list',dateTime:DateTime.now().toISO(),list: sensors};
```

Inoltre i sensori implementano una API REST per ricevere comandi dall’attuatore tramite backchannel. Tutti questi microservizi possono ricevere comandi relativi all’aggiunta o alla rimozione di sensori della tipologia di cui si occupano, tramite l’endpoint *'/add-sensor'*. Se l’azione riguarda l'aggiunta di un sensore, il microservizio in questione si occupa di aggiungere alla propria lista un sensore con le proprietà indicate nel messaggio. Se, invece, l’azione riguarda la rimozione di un sensore già esistente, il microservizio rimuove dalla sua lista il sensore in questione.  
Per gestire queste operazioni, ed in generale tutte le modifiche alle liste dei microservizi contenenti le proprietà dei sensori della stanza, è stata utilizzata la programmazione funzionale.

Per i sensori è stato simulato lo spegnimento dei container tramite l’utilizzo del metodo *_scheduleDeath()*, in cui viene generato casualmente il tempo per cui essi rimarranno attivi prima di chiamare *process.exit()*. Il container spento riparte grazie all’opzione restart in docker-compose, senza causare l’interruzione dell’intero sistema. 
