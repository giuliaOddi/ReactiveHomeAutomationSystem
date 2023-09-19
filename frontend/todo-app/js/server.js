//import {WebSocket} from './ws';

(function (win) {

    var sensors_properties = []; 

    // Stati sensori
    const ON_OPEN = 0;
    const OFF_CLOSE = 1;
    const ERROR = -1; 
    const ADD = 2;
    const REMOVE = 3;
    var ws = null;

    var timeout;
    
    function add_sensor(type, name, temperature){
        var addSensor = {};
        if (type === "heatpump" || type === "thermometer"){
            addSensor = {
                action: ADD,
                sensor_type: type,
                sensor_name: name,
                state: OFF_CLOSE,
                temperature: temperature
            };
        }
        else {
            addSensor = {
                action: ADD,
                sensor_type: type,
                sensor_name: name,
                state: OFF_CLOSE
            };
        }
        
        ws.send(JSON.stringify(addSensor));
    }

    function remove_sensor(type, name){
        var removeSensor = {
            action: REMOVE,
            sensor_type: type,
            sensor_name: name
        };
        
        ws.send(JSON.stringify(removeSensor));
    }

    function change_sensor_state(type, name, state){
        const changeState = {
            action: state,
            sensor_type: type,
            sensor_name: name
        };
        ws.send(JSON.stringify(changeState));
    }

    function show_temperature_field() {
        var menu = document.getElementById("sensors");
        var temperature = document.getElementById("temperature");
        if (menu.value == "heatpump"){
            temperature.style.display = "block";
        }
        else{
            temperature.style.display = "none";
        }
    }

    function hide_temperature_field() {
        var menu = document.getElementById("sensors");
        var temperature = document.getElementById("temperature");
        temperature.style.display = "none";
    }

    function remove_sensor_options(){
        // Filtra gli elementi con type diverso da 'weather'
        var sensors_to_choose_from = sensors_properties.filter(item => item.type !== 'weather');

        var sensorsToRemove = document.getElementById("sensorsToRemove");

        while (sensorsToRemove.options.length > 0) {
            sensorsToRemove.remove(0);
        }

        // Aggiungi gli elementi filtrati al menu a tendina
        sensors_to_choose_from.forEach(item => {
            var option = document.createElement("option");
            option.text = item.type + ': ' + item.name;
            option.value = item.type + ':' + item.name;
            sensorsToRemove.add(option);
        });
    }

    function show_sensors_state(){
        var sensorList = document.getElementById("sensorsStateChange");

        while (sensorList.childNodes.length > 0) {
            sensorList.removeChild(sensorList.firstChild); 
        }

        // Filtra gli elementi con type diverso da 'weather'
        var sensors_to_choose_from = sensors_properties.filter(item => item.type !== 'weather' && item.type !== 'thermometer');

        sensors_to_choose_from.forEach(item => {

            var labelSwitch = document.createElement("label");
            labelSwitch.className = "toggle";

            var switchSpan = document.createElement("span");
            switchSpan.className = "toggle-label"; 
            switchSpan.textContent = item.type + ": " + item.name + " "; 
            labelSwitch.appendChild(switchSpan);

            var inputSwitch = document.createElement("input");
            inputSwitch.className = "toggle-checkbox";
            if (item.state === ON_OPEN) {
                inputSwitch.checked = true; 
            }
            inputSwitch.type = "checkbox";
            labelSwitch.appendChild(inputSwitch);

            var switchDiv = document.createElement("div");
            switchDiv.className = "toggle-switch";
            labelSwitch.appendChild(switchDiv);

            inputSwitch.addEventListener("click", () => {
                var state = (item.state === ON_OPEN) ? OFF_CLOSE : ON_OPEN;
                change_sensor_state(item.type, item.name, state); 
                clearTimeout(timeout); 
                timeout = setTimeout(show_sensors_state, 5000);  
            });
            sensorList.appendChild(labelSwitch); 

            sensorList.appendChild(document.createElement("br")); 
            sensorList.appendChild(document.createElement("br")); 
        }); 
                     
    }

    function run() {            

        ws = new WebSocket('ws://10.88.0.11:7000/ws');
        let count = 0;
    
        ws.addEventListener("open", () => {
            console.log("Successfully connected...");
            ws.send('{"type": "subscribe", "target": "room_properties"}');
        });
    
        ws.addEventListener("error" , () => {
            console.log("Error on connection...");
            console.log("Trying to reconnect...");
            ws = null;
            setTimeout(run, 1000);
        }); 
    
        
        ws.addEventListener("message", (event) => {
            count++;
            var tmp = JSON.parse(event.data); 

            if(tmp.type == 'sensors_list'){
                
                var elements_added = tmp.list.map(item => (sensors_properties.find(item2 => (item2.type === item.type && item2.name === item.name) ) ? false : true))
                    .filter(item => item!=false);

                var elements_removed = sensors_properties.map(item => (tmp.list.find(item2 => item2.type === item.type && item2.name === item.name )) ? false : true )
                .filter(item => item!=false);

                sensors_properties = tmp.list; 
                console.log(sensors_properties); 

                // var elements_changed = tmp.list.map(item => (sensors_properties.find(item2 => (item2.type === item.type && item2.name === item.name && item.state === item2.state) ) ? false : true))
                //     .filter(item => item!=false);
                
                // if(elements_changed.length > 0 || elements_added.length > 0 || elements_removed.length > 0){
                //     show_sensors_state();
                // }
                //clearTimeout(timeout); 
                //timeout = setTimeout(show_sensors_state, 2000);   

                if (elements_added.length > 0 || elements_removed.length > 0){
                    remove_sensor_options();
                    show_sensors_state();
                }
            }
            if (count == 3){
                const openDoor = {
                    action: ON_OPEN,
                    sensor_type: 'door',
                    sensor_name: 'door1',
                };
                //ws.send(JSON.stringify(openDoor));
    
                const changeHeatpump = {
                    action: ON_OPEN,
                    sensor_type: 'heatpump',
                    sensor_name: 'heatpump1',
                    state: ON_OPEN, 
                    temperature: 24
                };
                //ws.send(JSON.stringify(changeHeatpump));
    
                const offHeatpump = {
                    action: OFF_CLOSE,
                    sensor_type: 'heatpump',
                    sensor_name: 'heatpump2'
                };
                //ws.send(JSON.stringify(offHeatpump));
    
                const addWindow = {
                    action: ADD,
                    sensor_type: 'window',
                    sensor_name: 'window4',
                    state: ON_OPEN
                };
                //ws.send(JSON.stringify(addWindow));
    
                const removeWindow = {
                    action: REMOVE,
                    sensor_type: 'window',
                    sensor_name: 'window1'
                };
                //ws.send(JSON.stringify(removeWindow));
    
                const removeHeatpump = {
                    action: REMOVE,
                    sensor_type: 'heatpump',
                    sensor_name: 'heatpump2'
                };
                //ws.send(JSON.stringify(removeHeatpump));
    
                const addHeatpump = {
                    action: ADD,
                    sensor_type: 'heatpump',
                    sensor_name: 'heatpump3',
                    state: ON_OPEN,
                    temperature: 30
                };
                //ws.send(JSON.stringify(addHeatpump));
    
                const addTherm = {
                    action: ADD,
                    sensor_type: 'thermometer',
                    sensor_name: 'therm2',
                    state: ON_OPEN,
                    temperature: 20
                };
                //ws.send(JSON.stringify(addTherm));
    
                const removeTherm = {
                    action: REMOVE,
                    sensor_type: 'thermometer',
                    sensor_name: 'therm1'
                };
                //ws.send(JSON.stringify(removeTherm));
            }
            /*
            if (count == 5){
                ws.send('{"type": "unsubscribe", "target": "room_properties"}');
            }
            */

            
        });
        setTimeout(show_sensors_state, 1500);

        
    }
    run();

    /* Exports components and functions */
    win.add_sensor ||= add_sensor; 
    win.remove_sensor ||= remove_sensor; 
    win.show_temperature_field ||= show_temperature_field; 
    win.hide_temperature_field ||= hide_temperature_field; 

})(window); 

