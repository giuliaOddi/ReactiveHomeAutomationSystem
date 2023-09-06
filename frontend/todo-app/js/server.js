import {WebSocket} from 'ws';

function run() {

    // comunicazione con heat pump sensor service
    let ws = new WebSocket('ws://10.88.0.11:7000');
    let count = 0;

    ws.on('error', err => {
        console.log("Error on connection...");
        console.log("Trying to reconnect...");
        ws = null;
        setTimeout(run, 1000);
      })

    ws.on('open', function open() {
        console.log("Successfully connected...");
        // Salvataggio heat pump sensor nella lista delle proprietà 
        ws.send('{"type": "subscribe", "target": "room_properties"}');
    });

    ws.on('message', function message(data) {
    count++;
    console.log('received: %s', data);
    //console.log(sensor_properties); 
    if (count == 5){
        ws.send('{"type": "unsubscribe", "target": "room_properties"}');
    }
    });
}
run();
