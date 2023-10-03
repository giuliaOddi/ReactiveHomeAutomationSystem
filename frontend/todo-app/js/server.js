//import {WebSocket} from './ws';

(function (win) {

    const { BehaviorSubject } = rxjs;
    const { map } = rxjs;
    //const {Chart} = import("chart.js");

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
/* 
    function increaseValue(temperature) {
        const numberInput = button.parentElement.querySelector('.number');
        var value = parseInt(numberInput.innerHTML, 10);
        if(isNaN(value)) value = 0;
        value > 34 ? value = 34 : ''; 
        numberInput.innerHTML = value+1;
    }
        
    function decreaseValue(temperature) {
        const numberInput = button.parentElement.querySelector('.number');
        var value = parseInt(numberInput.innerHTML, 10);
        if(isNaN(value)) value = 0;  
        value < 16 ? value = 16 : ''; 
        numberInput.innerHTML = value-1;
    } */

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
            sensorList.appendChild(labelSwitch);

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
                var state = (item.state === ON_OPEN) ? OFF_CLOSE : ON_OPEN;
                if (item.type == 'heatpump'){
                    change_sensor_state(item.type, item.name, state, item.temperature); 
                }
                else{
                    change_sensor_state(item.type, item.name, state, null); 
                }

                if (state === ON_OPEN) {
                    temperatureAlert.textContent = "";
                }
                
                
                clearTimeout(timeout); 
                timeout = setTimeout(show_sensors_state, 4000);  
            }); 
            labelSwitch.appendChild(switchDiv);

            if (item.type === "heatpump"){
                var temperature = item.temperature;
                var divField = document.createElement("div");
                divField.className = "quantity-field";

                var buttonDecrease = document.createElement("button");
                buttonDecrease.className = "value-button decrease-button";
                
                buttonDecrease.addEventListener("click", () => {
                    if (inputSwitch.checked){
                        temperature--; 
                        temperature < 15 ? temperature = 15 : ''; 
                        divNumber.textContent = temperature; 
                    }
                    else {
                        temperatureAlert.textContent = "You can change the temperature only if the heatpump is on!";
                    }
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
                    if (inputSwitch.checked){
                        temperature++; 
                        temperature > 35 ? temperature = 35 : ''; 
                        divNumber.textContent = temperature; 
                    }
                    else {
                        temperatureAlert.textContent = "You can change the temperature only if the heatpump is on!";
                    }
                }); 
                buttonIncrease.textContent = "+"; 
                divField.appendChild(buttonIncrease);

                labelSwitch.appendChild(document.createElement("br")); 
                labelSwitch.appendChild(document.createElement("br")); 
                //sensorList.appendChild(divField); 
                labelSwitch.appendChild(divField); 

                var setTempButton = document.createElement("button"); 
                setTempButton.textContent = "Set new temperature"; 
                
                //setTempButton.onclick = function() { change_heatpump_temperature(item.name, item.state, parseInt(divNumber.querySelector('.number').innerHTML, 10)); }; 
                setTempButton.addEventListener("click", () => {
                    if (inputSwitch.checked){
                        change_heatpump_temperature(item.name, item.state, parseInt(divNumber.textContent, 10)); 
                        clearTimeout(timeout);
                        setTimeout(show_sensors_state, 4000);
                    }
                    else {
                        temperatureAlert.textContent = "You can change the temperature only if the heatpump is on!";
                    }
                    
                }); 
                labelSwitch.appendChild(document.createElement("br")); 
                labelSwitch.appendChild(setTempButton); 
                labelSwitch.appendChild(temperatureAlert);
            }
            
            
            sensorList.appendChild(document.createElement("br")); 
            sensorList.appendChild(document.createElement("br")); 
        });     
    }

    function create_graph(chart) {
        
        const data = {
            labels: ['', '', ''],
            datasets: [
                {
                    label: 'Dataset Label',
                    data: [10, 20, 30],
                }
            ]
        };
        const config = {
            type: 'line',
            data: data,
        };

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
                return sensors_differences;     // ritorna aggiunte e modifiche ma NON rimozione sensori
            })
        );

        //userListChanged$.subscribe(value => console.log('list', value));
        userListDifference$.subscribe(value => {
            value.forEach(item => {
                console.log(item);
                // creazione o modifica grafici 
                // rimozione grafici di sensori rimossi
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

                list = tmp.list.slice();                
                userListChanged$.next(list);  
                
                var elements_added = tmp.list.map(item => (sensors_properties.find(item2 => (item2.type === item.type && item2.name === item.name) ) ? false : true))
                    .filter(item => item!=false);

                var elements_removed = sensors_properties.map(item => (tmp.list.find(item2 => item2.type === item.type && item2.name === item.name )) ? false : true )
                .filter(item => item!=false);

                var temperatures_changed = tmp.list.filter(item => (item.type === 'heatpump')).map(item => (sensors_properties.find(item2 => (item2.type === item.type && item2.name === item.name && item.temperature === item2.temperature) ) ? false : true))
                    .filter(item => item!=false);


                sensors_properties = list.slice();
                console.log(sensors_properties); 

                if (elements_added.length > 0 || elements_removed.length > 0){
                    remove_sensor_options();
                    //show_sensors_state();
                }
                if (elements_added.length > 0 || elements_removed.length > 0 || temperatures_changed.length > 0){
                    show_sensors_state();
                }
                   
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

        var chartsDiv = document.getElementById("charts");

        // var chartDiv = document.createElement("div");
        // var chartDiv2 = document.createElement("div");
        // var chartDiv3 = document.createElement("div");
        // //chartDiv.width = "50%";
        // //chartDiv2.width = "50%";
        // //chartDiv3.width = "50%";

        // chartsDiv.appendChild(chartDiv);
        // chartsDiv.appendChild(chartDiv2);
        // chartsDiv.appendChild(chartDiv3);

        var chartCanvas = document.createElement("canvas");
        chartCanvas.id = "myGraph";
        chartCanvas.height = "50";
        
        
        var chartCanvas2 = document.createElement("canvas");
        chartCanvas2.id = "myGraph2";
        chartCanvas2.height = "50";


        var chartCanvas3 = document.createElement("canvas");
        chartCanvas3.id = "myGraph3";
        chartCanvas3.height = "50";
        

        var chart = create_graph(chartCanvas);
        var chart2 = create_graph(chartCanvas2);
        var chart3 = create_graph(chartCanvas3);

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
        chartnew.update();

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

