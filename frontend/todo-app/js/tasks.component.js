'use strict';
(function (win) {

  /**
   * Given an HTML element representing a task, extracts the task's ID.
   * @param el {HTMLElement} An HTML element representing a task
   * @return {number} The task's ID
   */
  function taskIdOf(el) {
    const idStr = el.id.substring(5 /*'task-'.length*/);
    return parseInt(idStr, 10);
  }

  /**
   * A component that shows, adds and removes tasks.
   */
  class TasksComponent {
    #element = null;
    #client = null;
    #tasks = [];

    /**
     * Instances this component.
     * @param client {RestClient} A REST client
     */
    constructor(client) {
      this.#client = client;
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
      this.#element.className = 'tasks';
      this.#element.innerHTML = document.querySelector('script#tasks-template').textContent;

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

    /*async removeTask(task) {
      try {
        let i = this.#tasks.findIndex(t => t.model.id === task.id);
        if (i >= 0) {
          console.log(`Deleting task ${task.id}...`);
          const {model} = this.#tasks[i];
          await model.delete();
          console.log(`Task ${model.id}, '${model.description}' successfully deleted!`);

          // this must be repeated as other things might have changed
          i = this.#tasks.findIndex(t => t.model.id === task.id);
          const {component} = this.#tasks[i];
          component.destroy();
          this.#tasks.splice(i, 1);
        }
      } catch (e) {
        console.error(`Cannot delete task ${task.id}`, e);
      }
    }

    removeSelectedTasks() {
      const inps = this.#element.querySelectorAll('.task-left input[type=checkbox]:checked');
      const tasks = Array.prototype.slice.apply(inps).map(el => ({id: taskIdOf(el)}));
      tasks.forEach(this.removeTask.bind(this));
    }

    createTaskComponent(model) {
      const root = this.#element.querySelector('.tasks');
      const component = new TaskComponent(model);
      this.#tasks.push({model, component});
      const el = component.init();
      root.appendChild(el);
      component.on('completed', this.removeTask.bind(this));
    }

    async addTask(form) {
      const inp = form.querySelector('input');
      const desc = (inp.value || '').trim();
      if (desc) {
        console.log(`Saving new task '${desc}'...`);
        const model = new RestTaskModel(undefined, desc, this.#client);
        await model.create();
        console.log('Task successfully saved', {model: model.toDto()});
        this.createTaskComponent(model);
      }
    }*/

    // function that takes the input from the form to add a new sensor 
    addSensor(form) {

      var error_name = document.getElementById("error_name"); 
      error_name.textContent = "";

      var error_temperature = document.getElementById("error_temperature"); 
      error_temperature.textContent = "";

      var type = form.querySelector('#sensors');
      type = (type.value || '').trim();
      var sensor_name = form.querySelector('input#sensor_name');
      sensor_name = (sensor_name.value || '').trim();

      // check if the sensor already exists 
      var sensors_properties = get_sensors_properties(); 
      var sensor_found = sensors_properties.find(item => (item.type === type) && (item.name === sensor_name)); 
      if(sensor_found){
        error_name.textContent = "Sensor already added!"; 
      }

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
  win.TasksComponent ||= TasksComponent;

})(window);
