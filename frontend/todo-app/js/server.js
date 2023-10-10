(function (win) {

    const { BehaviorSubject } = rxjs;
    const { map } = rxjs;

    var sensors_properties = []; 

    // Stati sensori
    const ON_OPEN = 1;
    const OFF_CLOSE = 0;
    const ERROR = -1; 
    const ADD = 2;
    const REMOVE = 3;
    var ws = null;
   
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

    function create_graph(chart, title, value, color, type, sensor) {
        var data;
        var config;
        var date = new Date();
        var label = date.getHours() + ":" + date.getMinutes() + ":" + date.getSeconds(); 
        
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

        var list = []

        const userListChanged$ = new BehaviorSubject(list);
        const userListDifference$ = userListChanged$.pipe(
            map (current => 
            {               
                var sensors_differences = current
                    .map(item => sensors_properties
                    .find(item2 => (item2.type === item.type) && (item2.name === item.name) && (item2.state === item.state) && (item2.temperature === item.temperature) ) ? null : item)
                    .filter(item => item != null);
                //return _.difference(current, sensors_properties); 

                var removed_sensors = sensors_properties
                    .map(item => (current
                    .find(item2 => (item2.type === item.type && item2.name === item.name))) ? null : item )
                    .filter(item => item !== null);

                return [sensors_differences, removed_sensors];     // ritorna aggiunte e modifiche ma NON rimozione sensori
            })
        );

        userListDifference$.subscribe(differences => {
            
            var sensorList = document.getElementById("sensorsStateChange");

            // rimozione sensori
            var sensors_to_remove = differences[1].filter(item => item.type !== 'weather' && item.type !== 'thermometer');
            sensors_to_remove.forEach(item => {
                var divId = item.type + ": " + item.name + "-div";
                var brId = item.type + ": " + item.name + "-br";

                var divSensor = document.getElementById(divId);

                /*
                while (divSensor.options.length > 0) {
                    divSensor.remove(0);
                }*/

                sensorList.removeChild(divSensor);
                sensorList.removeChild(document.getElementById(brId));
                sensorList.removeChild(document.getElementById(brId));
            })

            // Filtra gli elementi con type diverso da 'weather'
            var sensors_to_choose_from = differences[0].filter(item => item.type !== 'weather' && item.type !== 'thermometer');

            // creazione o modifica buttons per cambio stati sensori
            sensors_to_choose_from.forEach(item => {

                var divId = item.type + ": " + item.name + "-div";
                var brId = item.type + ": " + item.name + "-br";
                //var inputSwitchId = item.type + ": " + item.name + "-inputSwitch";
                var errorId = item.type + ": " + item.name + "-sensorError";

                var divSensor = document.getElementById(divId);

                if (divSensor === null) {

                    var divSensor = document.createElement("div");
                    divSensor.id = divId;
                    divSensor.className = "stateChange"
                    sensorList.appendChild(divSensor);

                    var labelSwitch = document.createElement("label");
                    labelSwitch.className = "toggle";
                    divSensor.appendChild(labelSwitch);
        
                    var switchSpan = document.createElement("span");
                    switchSpan.className = "toggle-label"; 
                    switchSpan.textContent = item.type + ": " + item.name + " "; 
                    labelSwitch.appendChild(switchSpan);
        
                    var inputSwitch = document.createElement("input");
                    //inputSwitch.id = inputSwitchId;
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
                        
        
                        //item.state = state;
                        
                        
                        //clearTimeout(timeout); 
                        //timeout = setTimeout(show_sensors_state, 4000);  
                    }); 
                    labelSwitch.appendChild(switchDiv);

                    var sensor_error = document.createElement("div");
                    sensor_error.id = errorId;
                    sensor_error.className = "sensor_error";
                    sensor_error.style.color = "red";
                    divSensor.appendChild(sensor_error); 
        
                    if (item.type === "heatpump"){
                        var temperature = item.temperature;
                        var divField = document.createElement("div");
                        divField.className = "quantity-field";
        
                        var buttonDecrease = document.createElement("button");
                        buttonDecrease.className = "value-button decrease-button";
                        
                        buttonDecrease.addEventListener("click", () => {
                            temperature--; 
                            temperature < 15 ? temperature = 15 : ''; 
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
                            temperature > 35 ? temperature = 35 : ''; 
                            divNumber.textContent = temperature; 
                        }); 
                        buttonIncrease.textContent = "+"; 
                        divField.appendChild(buttonIncrease);
        
                        //sensorList.appendChild(divField); 
                        divSensor.appendChild(divField); 
        
                        var setTempButton = document.createElement("button"); 
                        setTempButton.textContent = "Set new temperature"; 
                        
                        //setTempButton.onclick = function() { change_heatpump_temperature(item.name, item.state, parseInt(divNumber.querySelector('.number').innerHTML, 10)); }; 
                        setTempButton.addEventListener("click", () => {
                            var sensor_state = sensors_properties.filter(sensor => (sensor.type === item.type && sensor.name === item.name)).map(sensor => sensor.state)[0];
                            if (sensor_state === ON_OPEN){
                                change_heatpump_temperature(item.name, item.state, parseInt(divNumber.textContent, 10)); 
                                //clearTimeout(timeout);
                                //setTimeout(show_sensors_state, 4000);
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
                                        // var inputSwitch = document.getElementById(inputSwitchId);
                    // if (item.state === ON_OPEN) {
                    //     inputSwitch.checked = true; 
                    // }
                    // else if (item.state === OFF_CLOSE){
                    //     inputSwitch.checked = false;
                    // }


                }

                if (item.state === ERROR){
                    var sensor_error = document.getElementById(errorId); 
                    sensor_error.textContent = "ERROR!";
                }
                else {
                    if (item.state === ON_OPEN){
                        var temperatureAlert = document.getElementById("tempAlert"); 
                        temperatureAlert.textContent = "";                
                    }
                    var sensor_error = document.getElementById(errorId); 
                    sensor_error.textContent = ""; 
                }

            });

            
        });

        //userListChanged$.subscribe(value => console.log('list', value));
        userListDifference$.subscribe(differences => {            

            differences[0].forEach(item => {
                //console.log(item);
                // creazione o modifica grafici 
                var chartsDiv = document.getElementById("charts");

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

                
                // grafico già esiste aggiungo nuovo stato 
                if(chartState != null || chartTemp != null) { 
                    if (item.type === "window" || item.type === "door" || item.type === "heatpump"){

                        var date = new Date();
                        var label = date.getHours() + ":" + date.getMinutes() + ":" + date.getSeconds(); 
        
                        chartState.data.labels.push(label);
                        chartState.data.datasets[0].data.push(item.state);  
                        chartState.update();
                    }
                    if (item.type === "weather" || item.type === "thermometer" || item.type === "heatpump"){

                        var date = new Date();
                        var label = date.getHours() + ":" + date.getMinutes() + ":" + date.getSeconds(); 
        
                        chartTemp.data.labels.push(label);
                        chartTemp.data.datasets[0].data.push(item.temperature);
                        chartTemp.update();

                    }
                }
                // grafico non esiste -> creazione 
                else {

                    if (item.type === "window" || item.type === "door" || item.type === "heatpump"){
                        var div = document.createElement("div");
                        div.id = "div-" + stateGraphName;
                        div.className = "sensorChart";
                        var canvas = document.createElement("canvas");
                        canvas.id = stateGraphName;
                        canvas.height = "250";  
                        canvas.width = "700"; 
                        create_graph(canvas, stateGraphName, item.state, "rgb(100, 100, 255)", "state", item.type);
                        div.appendChild(canvas); 
                        chartsDiv.appendChild(div);
                    }
                    if (item.type === "weather" || item.type === "thermometer" || item.type === "heatpump"){
                        var div = document.createElement("div");
                        div.id = "div-" + tempGraphName;
                        div.className = "sensorChart";
                        var canvas = document.createElement("canvas");
                        canvas.id = tempGraphName;
                        canvas.height = "250";  
                        canvas.width = "700";   
                        create_graph(canvas, tempGraphName, item.temperature, "rgb(255, 100, 100)", "temperature", item.type);    
                        div.appendChild(canvas); 
                        chartsDiv.appendChild(div);
                    }
                }

                
            });

            // rimozione grafici di sensori rimossi
            differences[1].forEach(item => {
                console.log(item);
                var stateGraphName = item.type + ": " + item.name + "-state";
                var tempGraphName = item.type + ": " + item.name + "-temperature";
                var chartsDiv = document.getElementById("charts");

                if (item.type === "window" || item.type === "door" || item.type === "heatpump"){
                    //var chart = Chart.getChart(stateGraphName);
                    //chart.destroy();
                    //var chartSpan = document.getElementById(stateGraphName);
                    var chartDiv = document.getElementById("div-" + stateGraphName);
                    //chartDiv.removeChild(chartSpan);
                    chartsDiv.removeChild(chartDiv);
                }
                if (item.type === "weather" || item.type === "thermometer" || item.type === "heatpump"){
                    var chart = Chart.getChart(tempGraphName);
                    //chart.destroy();
                    //var chartSpan = document.getElementById(tempGraphName);
                    var chartDiv = document.getElementById("div-" + tempGraphName);
                    //chartDiv.removeChild(chartSpan);
                    chartsDiv.removeChild(chartDiv);
                }
            });

        });

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

                list = tmp.list;                
                userListChanged$.next(list);  
                
                var elements_added = tmp.list.map(item => (sensors_properties.find(item2 => (item2.type === item.type && item2.name === item.name) ) ? false : true))
                    .filter(item => item!=false);

                var elements_removed = sensors_properties.map(item => (tmp.list.find(item2 => item2.type === item.type && item2.name === item.name )) ? false : true )
                .filter(item => item!=false);

                var temperatures_changed = tmp.list.filter(item => (item.type === 'heatpump')).map(item => (sensors_properties.find(item2 => (item2.type === item.type && item2.name === item.name && item.temperature === item2.temperature) ) ? false : true))
                    .filter(item => item!=false);


                sensors_properties = list;
                console.log(sensors_properties); 

                if (elements_added.length > 0 || elements_removed.length > 0){
                    remove_sensor_options();
                    //show_sensors_state();
                }
                /*
                if (elements_added.length > 0 || elements_removed.length > 0 || temperatures_changed.length > 0){
                    show_sensors_state();
                }*/
                   
            }
            
        });
        //setTimeout(show_sensors_state, 2000);

         //var myChart = document.getElementById("myChart").getContext('2d');
        /* 
        var divProva = document.createElement("div");
        divProva.textContent = "prova";
        myChart.appendChild(divProva);  */
        /* if (myChart) {
            myChart.destroy();
        } */

        // var ctx = document.getElementById("myChart").getContext("2d"), 

        //var chartsDiv = document.getElementById("charts");

        // var chartDiv = document.createElement("div");
        // var chartDiv2 = document.createElement("div");
        // var chartDiv3 = document.createElement("div");
        // //chartDiv.width = "50%";
        // //chartDiv2.width = "50%";
        // //chartDiv3.width = "50%";

        // chartsDiv.appendChild(chartDiv);
        // chartsDiv.appendChild(chartDiv2);
        // chartsDiv.appendChild(chartDiv3);

        /* var chartCanvas = document.createElement("canvas");
        chartCanvas.id = "myGraph";
        chartCanvas.height = "50";
        
        
        var chartCanvas2 = document.createElement("canvas");
        chartCanvas2.id = "myGraph2";
        chartCanvas2.height = "50";


        var chartCanvas3 = document.createElement("canvas");
        chartCanvas3.id = "myGraph3";
        chartCanvas3.height = "50";
        

        var chart = create_graph(chartCanvas, "myGraph");
        var chart2 = create_graph(chartCanvas2, "myGraph2");
        var chart3 = create_graph(chartCanvas3, "myGraph3");

        chart3.data.labels.push('');
        chart3.data.datasets[0].data.push(15);
        chart3.update();

        chart2.data.labels = ['','','',''];
        chart2.data.datasets[0].data = [10,0,20,0];
        chart2.update();

        chartsDiv.appendChild(chartCanvas);
        chartsDiv.appendChild(chartCanvas2);
        chartsDiv.appendChild(chartCanvas3);

        var chartnew = Chart.getChart("myGraph");
        chartnew.data.labels.push('');
        chartnew.data.datasets[0].data.push(0);
        chartnew.update(); */

        //////////////////////////
        // per rimuovere un grafico: 
        //var chart = Chart.getChart("myGraph");
        //chart.destroy();
        //var chartSpan = document.getElementById("myGraph");
        //chartsDiv.removeChild(chartSpan);


        /*
        document.addEventListener("DOMContentLoaded", function() {
            setTimeout(create_graph, 2000); 
        });*/
        
    }

    /* Exports components and functions */
    win.add_sensor ||= add_sensor; 
    win.remove_sensor ||= remove_sensor; 
    win.show_temperature_field ||= show_temperature_field; 
    win.hide_temperature_field ||= hide_temperature_field; 
    win.run ||= run;

})(window); 

