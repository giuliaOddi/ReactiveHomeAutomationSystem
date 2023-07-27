'use strict';

import {WeatherHandler} from './weather-handler.js';
import {v4 as uuid} from 'uuid';


/**
 * Initializes routes.
 * @param {Express} app Express application
 * @param {OIDCMiddleware} oidc OpenID Connect middleware
 * @param {{iface: string, port: number, auth: boolean, oidc: {redirect: string, clientId: string, secret: string}}} config Configuration options
 */
export function routes(app, oidc, config) {
  const authenticate = config.auth ? (req, res, next) => oidc.validate(req, res, next) : (_req, _res, next) => next();

  app.get('/login', (req, resp) => {
      oidc.login(req, resp);
  });

  app.get('/tokens', (req, resp) => {
      // noinspection JSIgnoredPromiseFromCall
      oidc.tokens(req, resp);
  });

  app.get('/tasks', authenticate, (req, resp) => {
      console.debug('Retrieving all tasks', {principal: req.principal.email});

      const objects = tasks.map(toDTO);
      resp.json({
          total: objects.length,
          results: objects
      });
  });

  app.post('/task', authenticate, (req, resp) => {
      const {description} = req.body;
      console.debug('Attempting to crete a new task', {description, principal: req.principal.email});

      if (!isNonBlank(description)) {
          resp.status(400);
          resp.json({error: 'Missing task description'});
          return;
      }
      if (description.trim().length > 50) {
          resp.status(400);
          resp.json({error: 'Too long task description'});
          return;
      }

      const task = new Task(seq(), description.trim());
      tasks.push(task);
      console.info('Task successfully created', {task, principal: req.principal.email});

      resp.status(201);
      resp.json(toDTO(task));
  });

  app.put('/task/:id', authenticate, (req, resp) => {
      const {description} = req.body;
      const idRaw = req.params.id;
      console.debug('Attempting to update task', {id: idRaw, description, principal: req.principal.email});

      if (!isNonBlank(description)) {
          resp.status(400);
          resp.json({error: 'Missing task description'});
          return;
      }
      if (description.trim().length > 50) {
          resp.status(400);
          resp.json({error: 'Too long task description'});
          return;
      }
      if (!isInteger(idRaw)) {
          resp.status(400);
          resp.json({error: 'Invalid task identifier'});
          return;
      }
      const id = parseInt(idRaw, 10);
      const task = tasks.find(t => t.id === id);
      if (!task) {
          resp.status(404);
          resp.json({error: 'Task not found'});
          return;
      }

      task.description = description.trim();
      resp.status(200);
      console.info('Task successfully updated', {task, principal: req.principal.email});

      resp.json(toDTO(task));
  });

  app.delete('/task/:id', authenticate, (req, resp) => {
      const idRaw = req.params.id;
      console.debug('Attempting to delete task', {id: idRaw, principal: req.principal.email});

      if (!isInteger(idRaw)) {
          resp.status(400);
          resp.json({error: 'Invalid task identifier'});
          return;
      }
      const id = parseInt(idRaw, 10);
      const j = tasks.findIndex(t => t.id === id);
      if (j < 0) {
          resp.status(404);
          resp.json({error: 'Task not found'});
          return;
      }
      const [task] = tasks.splice(j, 1);

      console.info('Task successfully deleted', {task, principal: req.principal.email});
      resp.status(200);
      resp.json(toDTO(task));
  });
}