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

    const ws1 = new WebSocket('ws://10.88.0.41:3000');

    let count1 = 0;

    ws1.on('error', console.error);

    ws1.on('open', function open() {
      ws1.send('{"type": "subscribe", "target": "temperature"}');
    });
    
    ws1.on('message', function message(data) {
      count1++;
      console.log('received: %s', data);
      if (count1 == 5){
        ws1.send('{"type": "unsubscribe", "target": "temperature"}');
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
}

// noinspection JSIgnoredPromiseFromCall
run();
