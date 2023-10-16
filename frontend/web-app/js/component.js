'use strict';
(function (win) {

  /**
   * A component that handles forms.
   */
  class FormComponent {
    #element = null;

    /**
     * Instances this component.
     * 
     */
    constructor() {
    }

    /**
     * Destroys this component, removing it from it's parent node.
     */
    destroy() {
      this.#element.remove();
    }

    /**
     * Initializes the component.
     * @return {Promise<HTMLElement>} The root element for this component.
     */
    async init() {
      this.#element = document.createElement('div');
      this.#element.className = 'forms';
      this.#element.innerHTML = document.querySelector('script#forms-template').textContent;

      // form used to add new sensors 
      const form_add = this.#element.querySelector('form[name="add-sensor"]');
      if (!form_add) {
        toast('Cannot initialize components: no <b>form</b> found', 'error');
      }
      
      form_add.addEventListener('submit', ($event) => {
        $event.preventDefault();
        this.addSensor(form_add); 
        form_add.reset();
      }); 

      // form used to remove sensors 
      const form_remove = this.#element.querySelector('form[name="remove-sensor"]');
      if (!form_remove) {
        toast('Cannot initialize components: no <b>form</b> found', 'error');
      }

      form_remove.addEventListener('submit', ($event) => {
        $event.preventDefault();
        this.removeSensor(form_remove); 
        form_remove.reset();
      });  

      return this.#element;
    }

    // function that takes the input from the form to add a new sensor 
    addSensor(form) {

      var error_name = document.getElementById("error_name"); 
      error_name.textContent = "";

      var error_temperature = document.getElementById("error_temperature"); 
      error_temperature.textContent = "";

      // sensor type choose
      var type = form.querySelector('#sensors');
      type = (type.value || '').trim();
      //sensor name inserted
      var sensor_name = form.querySelector('input#sensor_name');
      sensor_name = (sensor_name.value || '').trim();

      // check if the sensor already exists 
      var sensors_properties = get_sensors_properties(); 
      var sensor_found = sensors_properties.find(item => (item.type === type) && (item.name === sensor_name)); 
      if(sensor_found){
        error_name.textContent = "Sensor already added!"; 
      }

      // temperature inserted
      var temperature = form.querySelector('input#temperature');
      temperature = parseFloat((temperature.value || '20').trim());
      
      // check if the temperature is valid  
      if (temperature < 15 || temperature > 35){
        error_temperature.textContent = "Not valid temperature!"; 
      }

      add_sensor(type, sensor_name, temperature);   // server.js file
    }

    // function that takes the input from the form to remove a sensor 
    removeSensor(form) {
      var value = form.querySelector('#sensorsToRemove');
      value = (value.value || '').trim();
      var type = value.split(':')[0];
      var sensor_name = value.split(':')[1];

      remove_sensor(type, sensor_name);   // server.js file
    }

  }

  /* Exporting component */
  win.FormComponent ||= FormComponent;

})(window);
