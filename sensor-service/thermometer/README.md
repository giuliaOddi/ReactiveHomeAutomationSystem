# Thermometer 

Questo microservizio viene utilizzato per tenere traccia di tutti i sensori di tipo termometro presenti nella stanza. Per semplicità, è stato inserita anche in questi sensori la proprietà “state” per avere una rappresentazione comune agli altri sensori e facilitare quindi la gestione delle liste. Lo stato dei termometri è però irrilevante. La proprietà fondamentale di questi sensori è la temperatura, che misura la temperatura interna alla stanza e che di default viene impostata a 20°C. 

Questo microservizio accetta tramite REST due diverse tipologie di messaggi: 
* messaggi per la rimozione o l’aggiunta di un sensore: come per i sensori descritti in precedenza, questi messaggi sono ricevuti sull’endpoint ‘/add-sensor’ e in base al messaggio ricevuto la lista viene aggiornata.
* messaggi che riguardano la lista aggiornata dei sensori presenti nella stanza: questi messaggi vengono ricevuti sull’endpoint ‘/room_properties’ e sono inviati dall’actuator. Ogni volta che il termometro riceve questi aggiornamenti, calcola due temperature importanti: la prima, che viene salvata in temp_diff_weather, indica la differenza tra la temperatura interna della stanza e quella all’esterno (relativa al weather-service); la seconda, salvata in temp_diff_heatpump, indica la differenza tra la temperatura interna della stanza e la temperatura operativa dell’heatpump. Nel caso in cui siano presenti più heatpump, viene considerata la temperatura operativa massima. Dopodiché, sulla base delle proprietà di tutti i sensori della stanza, viene aggiornata la temperatura rilevata dal termometro.

La simulazione del cambiamento di temperatura è stata implementata nel metodo temperature_simulation(). I cambiamenti di temperatura avvengono gradualmente, in base alla casistica con un diverso numero di iterazioni, ogni 2 secondi tramite un .setTimeout(). Al termine delle iterazioni, la temperatura del termometro si stabilizza se non ci sono modifiche allo stato della stanza. Nel caso in cui ci fosse un sensore in stato di errore, allora nel calcolo della temperatura viene considerato come se fosse spento (oppure chiuso). 

La temperatura viene quindi calcolata e modificata in base alle caratteristiche attuali della stanza:
* se almeno una heatpump è accesa, con temperatura operativa maggiore di quella attuale della stanza:
  * se almeno una finestra è aperta:
    * se la temperatura all’esterno è maggiore di quella della stanza, allora la temperatura del termometro salirà in 3 iterazioni fino a raggiungere il massimo tra la temperatura esterna e quella della pompa di calore. 
    * altrimenti significa che la temperatura all’esterno è minore di quella all’interno e quindi la temperatura del termometro aumenta più lentamente, con 8 iterazioni, fino a raggiungere la temperatura della pompa di calore.
  * altrimenti, se tutte le finestre sono chiuse, la temperatura salirà fino a raggiungere quella della pompa di calore in 5 iterazioni.
* se almeno una finestra è aperta e tutte le pompe di calore sono spente, oppure almeno una di esse è accesa ma con temperatura operativa inferiore di quella della stanza:
  * se nessuna porta è aperta, allora la temperatura del termometro aumenta con 3 iterazioni, fino a raggiungere la temperatura dell’esterno.
  * altrimenti, la temperatura del termometro aumenta più lentamente (5 iterazioni) dato il ricircolo d’aria con il resto della casa, fino a raggiungere la temperatura esterna.
* in tutti gli altri casi, ovvero se le finestre sono chiuse e le pompe di calore sono spente o con temperatura operativa inferiore rispetto a quella attuale della stanza, la temperatura del termometro non viene modificata. 
