import {WebSocket} from 'ws';

async function run() {

    // comunicazione con heat pump sensor service
    const ws = new WebSocket('ws://10.88.0.11:7000');
    let count = 0;

    ws.on('error', console.error);

    ws.on('open', function open() {
    // Salvataggio heat pump sensor nella lista delle proprietà 
    ws.send('{"type": "subscribe", "target": "room_properties"}');
    });

    ws.on('message', function message(data) {
    count++;
    console.log('received: %s', data);
    console.log(sensor_properties); 
    if (count == 5){
        ws.send('{"type": "unsubscribe", "target": "room_properties"}');
    }
    });
}
run();
