'use strict';

import {WeatherHandler} from './weather-handler.js';
import {v4 as uuid} from 'uuid';


/**
 * Initializes routes.
 * @param {Express} app Express application
 * @param {{iface: string, port: number, auth: boolean}} config Configuration options
 */
export function routes(app) {

    app.get('/', (req, res) => {
        res.send('Hello World!')
    })
}