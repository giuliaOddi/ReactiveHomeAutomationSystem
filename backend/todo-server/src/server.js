'use strict';

import util from 'util';

// utilities
import {v4 as uuid} from 'uuid';

// express
import express from 'express';
import methodOverride from 'method-override';
import bodyParser from 'body-parser';
import compression from 'compression';

// own modules
import opts from './options.js';
import {routes} from './routes.js';
import {OIDCMiddleware} from './openid.js';

import {WebSocket} from 'ws';

import fetch from 'node-fetch';


/**
 * Initializes the application middlewares.
 *
 * @param {Express} app Express application
 */
function init(app) {
    app.use(compression());
    app.use(methodOverride());
    app.use(bodyParser.json());
    app.use(bodyParser.urlencoded({extended: true}));

    // sets the correlation id of any incoming requests
    app.use((req, res, next) => {
        req.correlationId = req.get('X-Request-ID') || uuid();
        res.set('X-Request-ID', req.id);
        next();
    });
}

/**
 * Installs fallback error handlers.
 *
 * @param app Express application
 * @returns {void}
 */
function fallbacks(app) {
    // generic error handler => err.status || 500 + json
    // NOTE keep the `next` parameter even if unused, this is mandatory for Express 4
    /* eslint-disable-next-line no-unused-vars */
    app.use((err, req, res, next) => {
        const errmsg = err.message || util.inspect(err);
        console.error(`💥 Unexpected error occurred while calling ${req.path}: ${errmsg}`);
        res.status(err.status || 500);
        res.json({error: err.message || 'Internal server error'});
    });

    // if we are here, then there's no valid route => 400 + json
    // NOTE keep the `next` parameter even if unused, this is mandatory for Express 4
    /* eslint-disable no-unused-vars */
    app.use((req, res, next) => {
        console.error(`💥 Route not found to ${req.path}`);
        res.status(404);
        res.json({error: 'Not found'});
    });
}

async function run() {
    // creates the configuration options and the logger
    const options = opts();
    console.debug('🔧 Configuration', options);

    console.debug(`🔧 Initializing OpenID Connect...`);
    const oidc = new OIDCMiddleware(options.config.oidc);
    await oidc.init();

    console.debug(`🔧 Initializing routes...`);


    const ws = new WebSocket('ws://10.88.0.31:5000');
    let count = 0;

    ws.on('error', console.error);

    ws.on('open', function open() {
      ws.send('{"type": "subscribe", "target": "temperature"}');
    });
    
    ws.on('message', function message(data) {
      count++;
      console.log('received: %s', data);
      if (count == 5){
        ws.send('{"type": "unsubscribe", "target": "temperature"}');
      }
    });

    const app = express();
    init(app);
    routes(app, oidc, options.config);
    fallbacks(app);

    const {iface, port} = options.config;
    app.listen(port, iface, () => {
        // noinspection HttpUrlsUsage
        console.info(`🏁 Server listening: http://${iface}:${port}`);
    });

    // comunicazione con actuator
    const serverAddress = 'http://10.88.0.41:3000'; // Indirizzo del tuo server
    const endpoint = '/status'; // Il percorso dell'endpoint desiderato sul server

    // Dati da inviare nel corpo della richiesta POST (in questo esempio un oggetto JSON)
    const postData = {
      action: 'open',
      sensor: "door",
    };

    // Configura la richiesta HTTP POST
    fetch(serverAddress + endpoint, {
      method: 'POST', // Metodo della richiesta
      headers: {
        'Content-Type': 'application/json', // Specifica che i dati inviati sono in formato JSON
      },
      body: JSON.stringify(postData), // Converti i dati in formato JSON e inseriscili nel corpo della richiesta
    })
      .then((response) => {
        if (!response.status) {
          throw new Error('Errore nella richiesta HTTP: ' + response);
        }
        return response; 
      })
      .then((data) => {
        // Usa i dati ottenuti dalla risposta
        console.log('Risposta POST ricevuta:');
      })
      .catch((error) => {
        console.error('Si è verificato un errore:', error);
      });






}

// noinspection JSIgnoredPromiseFromCall
run();
