(function (win) {

    const { BehaviorSubject } = rxjs;
    const { map } = rxjs;

    // list of sensors  
    var sensors_properties = []; 

    // possible states of sensors 
    const ON_OPEN = 1;
    const OFF_CLOSE = 0;
    const ERROR = -1; 

    // possible actions
    const ADD = 2;
    const REMOVE = 3;
    var ws = null;
    var timeout;
    var htmlTimeout;

    var list = []

    // subjects used to check new events -> new list 
    var sensorsListChanged$;
    var sensorsListDifference$;
   
    // sends a message to the backend to add the new sensor 
    function add_sensor(type, name, temperature){
        var addSensor = {};
        // for heatpump and thermometer there is also the temperature 
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

    // sends a message to the backend to remove the sensor 
    function remove_sensor(type, name){
        var removeSensor = {
            action: REMOVE,
            sensor_type: type,
            sensor_name: name
        };        
        ws.send(JSON.stringify(removeSensor));
    }

    // sends a message to the backend to change the status of the sensor  
    function change_sensor_state(type, name, state, temperature){
        var changeState= {};
        if (type === "heatpump"){
            changeState = {
                action: state,
                sensor_type: type,
                sensor_name: name,
                temperature : temperature
            };
        }
        else {
            changeState = {
                action: state,
                sensor_type: type,
                sensor_name: name
            };
        }
        ws.send(JSON.stringify(changeState));
    }

    // sends a message to the backend to change the temperature of the heatpump 
    function change_heatpump_temperature(name, state, temperature){
        const changeTemperature = {
            action: ON_OPEN,
            sensor_type: 'heatpump',
            sensor_name: name,
            state: state, 
            temperature: temperature
        };
        ws.send(JSON.stringify(changeTemperature));
    }

    // shows the temperature field only for sensors with type == heatpump 
    function show_temperature_field() {
        
        var error_name = document.getElementById("error_name"); 
        error_name.textContent = "";
  
        var error_temperature = document.getElementById("error_temperature"); 
        error_temperature.textContent = "";

        var menu = document.getElementById("sensors");
        var temperature = document.getElementById("temperature");
        if (menu.value == "heatpump"){
            temperature.style.display = "block";
        }
        else{
            temperature.style.display = "none";
        }
    }

    // hide the temperature field for sensors with type != heatpump 
    function hide_temperature_field() {
        var temperature = document.getElementById("temperature");
        temperature.style.display = "none";
    }

    // options shown to remove a sensor 
    function remove_sensor_options(){
        // can remove only sensors with type != weather 
        var sensors_to_choose_from = sensors_properties.filter(item => item.type !== 'weather');

        var sensorsToRemove = document.getElementById("sensorsToRemove");

        if (sensorsToRemove === null){
            console.log("Loading page...");
            setTimeout(remove_sensor_options, 500);
        }
        else {

            while (sensorsToRemove.options.length > 0) {
                sensorsToRemove.remove(0);
            }

            // show sensors in the menu 
            sensors_to_choose_from.forEach(item => {
                var option = document.createElement("option");
                option.text = item.type + ': ' + item.name;
                option.value = item.type + ':' + item.name;
                sensorsToRemove.add(option);
            });
        }
    }

    // create the specific graph 
    function create_chart(chart, title, value, color, type, sensor) {
        var data;
        var config;
        var date = new Date();
        var label = date.getHours() + ":" + date.getMinutes() + ":" + date.getSeconds(); 
        
        // graph for sensors state 
        if (type === 'state'){
            data = {
                labels: [label],
                datasets: [
                    {
                        label: title,
                        data: [value],
                        borderColor: color,
                    }
                ]
            };
            config = {
                type: 'line',
                data: data, 
                options: {
                    responsive: false,
                    scales: {
                        x: {
                            position: 'bottom', 
                            title: {
                                display: true,
                                text: 'Time'
                            }
                        },
                        y: {
                            position: 'left',
                            title: {
                                display: true,
                                text: 'State'                                
                            },
                            ticks: {
                                callback: function(value) {
                                    var label;
                                    if (value === 0){
                                        if(sensor === 'heatpump'){
                                            label = 'OFF';
                                        }
                                        else {
                                            label = 'CLOSE';
                                        }
                                    }
                                    else if (value === 1) {
                                        if(sensor === 'heatpump'){
                                            label = 'ON';
                                        }
                                        else {
                                            label = 'OPEN';
                                        }
                                    }
                                    else if (value === -1){
                                        label = 'ERROR'
                                    }
                                    return label; 
                                }
                            }
                        },
                    },
                    plugins: {
                        legend: {
                            labels: {
                                font: {
                                    size: 20
                                }
                            }
                        }
                    }
                }
            };
        }

        // graph for sensors temperature  
        else if (type === 'temperature'){
            data = {
                labels: [label],
                datasets: [
                    {
                        label: title,
                        data: [value],
                        borderColor: color,
                    }
                ]
            };
            config = {
                type: 'line',
                data: data, 
                options: {
                    responsive: false,
                    scales: {
                        x: {
                            position: 'bottom', 
                            title: {
                                display: true,
                                text: 'Time'
                            }
                        },
                        y: {
                            position: 'left',
                            title: {
                                display: true,
                                text: 'Temperature'
                            },
                            ticks: {
                                callback: function(value) {                                    
                                    return Number(value.toFixed(2)) + '°C'; 
                                }
                            }
                        },
                    },
                    plugins: {
                        legend: {
                            labels: {
                                font: {
                                    size: 20
                                }
                            }
                        }
                    }
                }
            };
        }
        return new Chart(
            chart, 
            config
        )
    }

    function run() {     


        // subjects used to check new events -> new list 
        sensorsListChanged$ = new BehaviorSubject(list);
        sensorsListDifference$ = sensorsListChanged$.pipe(
            map (current => 
            {               
                // finds differences between the new list and the old one -> sensors added or modified 
                var sensors_differences = current
                    .map(item => sensors_properties
                    .find(item2 => (item2.type === item.type) && (item2.name === item.name) && (item2.state === item.state) && (item2.temperature === item.temperature) ) ? null : item)
                    .filter(item => item != null);

                // finds if some sensors where removed 
                var removed_sensors = sensors_properties
                    .map(item => (current
                    .find(item2 => (item2.type === item.type && item2.name === item.name))) ? null : item )
                    .filter(item => item !== null);

                return [sensors_differences, removed_sensors];     
            })
        );

        // subscribes to differences to update the web app 
        sensorsListDifference$.subscribe(differences => {
            
            var sensorList = document.getElementById("sensorsStateChange");

            if (sensorList === null){
                console.log("Loading page...");
                clearTimeout(htmlTimeout);
                htmlTimeout = setTimeout(run, 500);
            }
            else {
                
                // checks sensors removed 
                var sensors_to_remove = differences[1].filter(item => item.type !== 'weather' && item.type !== 'thermometer');
                // removes sensors from the web app 
                sensors_to_remove.forEach(item => {
                    var divId = item.type + ": " + item.name + "-div";
                    var brId = item.type + ": " + item.name + "-br";

                    var divSensor = document.getElementById(divId);

                    sensorList.removeChild(divSensor);
                    sensorList.removeChild(document.getElementById(brId));
                    sensorList.removeChild(document.getElementById(brId));
                })

                // checks modified or added sensors 
                var sensors_to_choose_from = differences[0].filter(item => item.type !== 'weather' && item.type !== 'thermometer');

                // creates or modifies buttons for modified sensors 
                sensors_to_choose_from.forEach(item => {

                    var divId = item.type + ": " + item.name + "-div";
                    var brId = item.type + ": " + item.name + "-br";
                    var iconId = item.type + ": " + item.name + "-stateIcon";

                    var divSensor = document.getElementById(divId);

                    // a new sensor was added -> creates the specific div in the web app 
                    if (divSensor === null) {

                        // sensor name and switch to change status 
                        var divSensor = document.createElement("div");
                        divSensor.id = divId;
                        divSensor.className = "stateChange"
                        sensorList.appendChild(divSensor);

                        // icon that shows the current state of the sensor
                        var divIcon = document.createElement("div");
                        divIcon.id = iconId;
                        if(item.state===ON_OPEN){
                            divIcon.className="fa fa-power-off";
                            divIcon.style.color = "lime";
                            divIcon.style.fontSize = "40px";
                            divIcon.style.position = "absolute";
                        }
                        else if(item.state===OFF_CLOSE){
                            divIcon.className="fa fa-power-off";
                            divIcon.style.color = "grey";
                            divIcon.style.fontSize = "40px";
                            divIcon.style.position = "absolute";
                        }
                        else{
                            divIcon.className="fa fa-times";
                            divIcon.style.color = "red";
                            divIcon.style.fontSize = "50px";
                            divIcon.style.position = "absolute";
                        }
                        divSensor.appendChild(divIcon);

                        var labelSwitch = document.createElement("label");
                        labelSwitch.className = "toggle";
                        divSensor.appendChild(labelSwitch);
            
                        var switchSpan = document.createElement("span");
                        switchSpan.className = "toggle-label"; 
                        switchSpan.textContent = item.type + ": " + item.name + " "; 
                        labelSwitch.appendChild(switchSpan);
            
                        var inputSwitch = document.createElement("input");
                        inputSwitch.className = "toggle-checkbox";
            
                        if (item.state === ON_OPEN) {
                            inputSwitch.checked = true; 
                        }
                        
                        var temperatureAlert = document.createElement("div");
                        temperatureAlert.id = "tempAlert";
                        temperatureAlert.style.color = "red";
                    
                        inputSwitch.type = "checkbox";
                        labelSwitch.appendChild(inputSwitch);
            
                        var switchDiv = document.createElement("div");
                        switchDiv.className = "toggle-switch";
                        if (item.type === "heatpump"){
                            switchDiv.id = "heatpump";
                        }
                        else {
                            switchDiv.id = "window-door";
                        }
                        // changes status of the specific sensor 
                        switchDiv.addEventListener("click", () => {

                            var sensor_state = sensors_properties.filter(sensor => (sensor.type === item.type && sensor.name === item.name)).map(sensor => sensor.state)[0];
                            var state;

                            if (!inputSwitch.checked && (sensor_state === OFF_CLOSE || sensor_state === ERROR)){
                                state = ON_OPEN;
                            }
                            else if(inputSwitch.checked && (sensor_state === ON_OPEN || sensor_state === ERROR)){
                                state = OFF_CLOSE;
                            }
                            else {
                                if (sensor_state === ON_OPEN){
                                    inputSwitch.checked = true;
                                    state = OFF_CLOSE;
                                }
                                else {
                                    inputSwitch.checked = false;
                                    state = ON_OPEN;
                                }
                            }
                            if (item.type == 'heatpump'){
                                change_sensor_state(item.type, item.name, state, temperature); 
                            }
                            else{
                                change_sensor_state(item.type, item.name, state, null); 
                            }
                        }); 
                        labelSwitch.appendChild(switchDiv);
            
                        // for heatpump sensors -> buttons used to change temperature and to send it 
                        if (item.type === "heatpump"){
                            var temperature = item.temperature;
                            var divField = document.createElement("div");
                            divField.className = "quantity-field";
            
                            var buttonDecrease = document.createElement("button");
                            buttonDecrease.className = "value-button decrease-button";
                            
                            buttonDecrease.addEventListener("click", () => {
                                temperature--; 
                                temperature < 15 ? temperature = 15 : '';   // not valid temperature under 15°C 
                                divNumber.textContent = temperature; 
                            }); 
                            buttonDecrease.textContent = "-";
                            divField.appendChild(buttonDecrease);
            
                            var divNumber = document.createElement("div");
                            divNumber.className = "number";
                            divNumber.textContent = temperature; 
                            divField.appendChild(divNumber);
            
                            var buttonIncrease = document.createElement("button");
                            buttonIncrease.className = "value-button increase-button";
                            buttonIncrease.addEventListener("click", () => {
                                temperature++; 
                                temperature > 35 ? temperature = 35 : '';   // not valid temperature over 35°C 
                                divNumber.textContent = temperature; 
                            }); 
                            buttonIncrease.textContent = "+"; 
                            divField.appendChild(buttonIncrease);
                            divSensor.appendChild(divField); 
            
                            var setTempButton = document.createElement("button"); 
                            setTempButton.textContent = "Set new temperature"; 
                            
                            // sends the specified temperature only if the specific heatpump is on 
                            setTempButton.addEventListener("click", () => {
                                var sensor_state = sensors_properties.filter(sensor => (sensor.type === item.type && sensor.name === item.name)).map(sensor => sensor.state)[0];
                                if (sensor_state === ON_OPEN){
                                    change_heatpump_temperature(item.name, item.state, parseInt(divNumber.textContent, 10)); 
                                }
                                else {
                                    temperatureAlert.textContent = "You can change the temperature only if the heatpump is on!";
                                }
                                
                            }); 
                            divSensor.appendChild(setTempButton); 
                            divSensor.appendChild(temperatureAlert);
                        }
                        
                        var br = document.createElement("br");
                        br.id = brId;

                        var br2 = document.createElement("br");
                        br2.id = brId;

                        sensorList.appendChild(br); 
                        sensorList.appendChild(br2); 
                    }
                    else {

                        // updates the icon with the current state of the sensor
                        var divIcon = document.getElementById(iconId);
                        if(item.state===ON_OPEN){
                            divIcon.className="fa fa-power-off";
                            divIcon.style.color = "lime";
                            divIcon.style.fontSize = "40px";
                        }
                        else if(item.state===OFF_CLOSE){
                            divIcon.className="fa fa-power-off";
                            divIcon.style.color = "grey";
                            divIcon.style.fontSize = "40px";
                        }
                        else{
                            divIcon.className="fa fa-times";
                            divIcon.style.color = "red";
                            divIcon.style.fontSize = "50px";
                        }
                    }

                    if (item.state === ON_OPEN){
                        var temperatureAlert = document.getElementById("tempAlert"); 
                        temperatureAlert.textContent = "";                
                    }
                });  
            }          
        });

        // subscribes to event to update charts 
        sensorsListDifference$.subscribe(differences => {            

            differences[0].forEach(item => {
                
                var chartsDiv = document.getElementById("charts");

                if (chartsDiv === null){
                    console.log("Loading page...");
                    clearTimeout(htmlTimeout);
                    htmlTimeout = setTimeout(run, 500);
                }
                else {

                    var stateGraphName = item.type + ": " + item.name + "-state";
                    var tempGraphName = item.type + ": " + item.name + "-temperature";

                    var chartState = null;
                    var chartTemp = null;

                    if (item.type === "window" || item.type === "door" || item.type === "heatpump"){
                        chartState = Chart.getChart(stateGraphName);
                    }
                    if (item.type === "weather" || item.type === "thermometer" || item.type === "heatpump"){
                        chartTemp = Chart.getChart(tempGraphName);
                    }
                    
                    // if the chart already exists -> update it 
                    if(chartState != null || chartTemp != null) { 
                        // for windows, doors and heatpump, updates the chart for states 
                        if (item.type === "window" || item.type === "door" || item.type === "heatpump"){
                            // current time 
                            var date = new Date();
                            var label = date.getHours() + ":" + date.getMinutes() + ":" + date.getSeconds(); 
                            // add to the chart the current state 
                            chartState.data.labels.push(label);
                            chartState.data.datasets[0].data.push(item.state);  
                            chartState.update();
                        }
                        // for weather, doors and heatpump, updates the chart for temperatures  
                        if (item.type === "weather" || item.type === "thermometer" || item.type === "heatpump"){
                            // current time 
                            var date = new Date();
                            var label = date.getHours() + ":" + date.getMinutes() + ":" + date.getSeconds(); 
                            // add to the chart the current temperature          
                            chartTemp.data.labels.push(label);
                            chartTemp.data.datasets[0].data.push(item.temperature);
                            chartTemp.update();
                        }
                    }
                    // if the chart doesn't exist -> create a new one 
                    else {
                        // for windows, doors and heatpump, creates the chart for states 
                        if (item.type === "window" || item.type === "door" || item.type === "heatpump"){
                            var div = document.createElement("div");
                            div.id = "div-" + stateGraphName;
                            div.className = "sensorChart";
                            var canvas = document.createElement("canvas");
                            canvas.id = stateGraphName;
                            canvas.height = "250";  
                            canvas.width = "700"; 
                            
                            create_chart(canvas, stateGraphName, item.state, "rgb(100, 100, 255)", "state", item.type);

                            div.appendChild(canvas); 
                            chartsDiv.appendChild(div);
                        }
                        // for weather, doors and heatpump, creates the chart for temperatures  
                        if (item.type === "weather" || item.type === "thermometer" || item.type === "heatpump"){
                            var div = document.createElement("div");
                            div.id = "div-" + tempGraphName;
                            div.className = "sensorChart";
                            var canvas = document.createElement("canvas");
                            canvas.id = tempGraphName;
                            canvas.height = "250";  
                            canvas.width = "700";  

                            create_chart(canvas, tempGraphName, item.temperature, "rgb(255, 100, 100)", "temperature", item.type);

                            div.appendChild(canvas); 
                            chartsDiv.appendChild(div);
                        }
                    }  
                }              
            });

            // used to remove graphs of removed sensors 
            differences[1].forEach(item => {
                var stateGraphName = item.type + ": " + item.name + "-state";
                var tempGraphName = item.type + ": " + item.name + "-temperature";
                var chartsDiv = document.getElementById("charts");

                if (item.type === "window" || item.type === "door" || item.type === "heatpump"){
                    var chartDiv = document.getElementById("div-" + stateGraphName);
                    chartsDiv.removeChild(chartDiv);
                }
                if (item.type === "weather" || item.type === "thermometer" || item.type === "heatpump"){
                    var chartDiv = document.getElementById("div-" + tempGraphName);
                    chartsDiv.removeChild(chartDiv);
                }
            });
        });

        connect_to_backend();
    }

    function connect_to_backend(){
        // communication with backend 
        ws = new WebSocket('ws://10.88.0.11:7000/ws');
    
        ws.addEventListener("open", () => {
            console.log("Successfully connected...");
            ws.send('{"type": "subscribe", "target": "room_properties"}');
        });
    
        ws.addEventListener("error" , () => {
            console.log("Error on connection...");
            console.log("Trying to reconnect...");
            ws = null;
            clearTimeout(timeout);
            timeout = setTimeout(connect_to_backend, 1000);
        }); 

        ws.addEventListener("close" , () => {
            console.log("Connection closed...");
            console.log("Trying to reconnect...");
            ws = null;
            clearTimeout(timeout);
            timeout = setTimeout(connect_to_backend, 1000);
        }); 
        
        ws.addEventListener("message", (event) => {
            var tmp = JSON.parse(event.data); 

            if(tmp.type == 'sensors_list'){

                list = tmp.list;                
                sensorsListChanged$.next(list);  
                
                // finds new sensors 
                var elements_added = tmp.list.map(item => (sensors_properties.find(item2 => (item2.type === item.type && item2.name === item.name) ) ? false : true))
                    .filter(item => item!=false);

                // finds removed sensors 
                var elements_removed = sensors_properties.map(item => (tmp.list.find(item2 => item2.type === item.type && item2.name === item.name )) ? false : true )
                .filter(item => item!=false);

                // updates the sensors list 
                sensors_properties = list;
                console.log(sensors_properties); 

                // updates the menu of sensors to remove 
                if (elements_added.length > 0 || elements_removed.length > 0){
                    remove_sensor_options();
                }                   
            }            
        });        
    }

    // return the list of sensors 
    function get_sensors_properties(){
        return sensors_properties; 
    }

    /* Exports components and functions */
    win.get_sensors_properties ||= get_sensors_properties; 
    win.add_sensor ||= add_sensor; 
    win.remove_sensor ||= remove_sensor; 
    win.show_temperature_field ||= show_temperature_field; 
    win.hide_temperature_field ||= hide_temperature_field; 
    win.run ||= run;

})(window); 

