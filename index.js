const express = require('express');

const ApplicationError = require('./errors');
const auth = require('./auth');

const REQUIRES_LOGIN = 'REQUIRES_LOGIN';
const NO_AUTH_MIDDLEWARE = 'NO_AUTH_MIDDLEWARE';

let config = { secret: null };

const configureRouter = options => (config = { ...config, ...options });

/**
 * This class is used to create routers. It makes use of decorators to define
 * each router and the routes it handles. This class makes it much easier to
 * handle more complex patterns, handle exceptions, multiple middlewares and all
 * of this without messing the code style.
 *
 * You should not make use of the class or it's functions and variables
 * directly. Just extend the class and use the decorators. Decorators will mark
 * each route and when the time comes to register the routes in Express, the
 * class constructor is called and all of those routes will be handed over to
 * Express along with their handler and exception handler and all of their
 * middlewares.
 */
class Router {
  constructor() {
    this.router = express.Router();
    const router = Router.routers[this.constructor.name];

    if (router.middlewares.before) {
      this.router.use(router.middlewares.before);
    }

    Object.keys(router.handlers).forEach(name => {
      const [method, [path, handler]] = router.handlers[name].handler;
      const middlewares = Router.applyMiddlewares(
        router.handlers[name].middlewares,
        {
          router: this.router,
          method,
          path,
        },
      );

      this.router[method](path, middlewares, handler);
    });

    if (router.middlewares.after) {
      this.router.use(router.middlewares.after);
    }

    if (!router.app || !router.basePath) {
      console.error(
        `Please configure the router with @require('feyna').routerConfig(express(), "/base-path")`,
      );
    }

    router.app.use(router.basePath || '/', this.router);
  }
}

Router.isRouterClass = true;
Router.routers = {};

Router.applyMiddlewares = (middlewares = [], { router, method, path }) => {
  let hasLoginMiddleware = false;
  const tmp = middlewares
    .map(middleware => {
      if (middleware === REQUIRES_LOGIN) {
        hasLoginMiddleware = true;
        return auth.middleware.required(config.secret);
      }

      if (middleware === NO_AUTH_MIDDLEWARE) {
        hasLoginMiddleware = true;
        return null;
      }

      return middleware;
    })
    .filter(middleware => middleware !== null);

  if (!hasLoginMiddleware) {
    tmp.push(auth.middleware.optional(config.secret));
  }

  return tmp;
};

Router.exceptionHandler = handler => (req, res, next) => {
  handler(req, res, next).catch(err => {
    if (err instanceof ApplicationError) {
      const status = err.info ? err.info.status : 400;
      if (err.info) {
        delete err.info.status;
      }

      res.status(status);
      res.json({
        message: err.message,
        data: err.info,
      });
      next();
      return;
    }

    next();
  });
};

Router.handler = handler => async (req, res, next) => {
  let timerLabel;
  if (process.env.NODE_ENV !== 'PRODUCTION') {
    timerLabel = Math.random();
    console.time(timerLabel + ' Request handled in');
  }

  const response = await handler(req, res);

  if (process.env.NODE_ENV !== 'PRODUCTION') {
    console.timeEnd(timerLabel + ' Request handled in');
  }

  next();
  if (response) {
    if (!response.status) {
      response.status = 200;
    }

    res.status(response.status);
    delete response.status;
    res.json(response);
  }
};

const _createRouter = router => {
  if (Router.routers[router.constructor.name]) {
    return;
  }

  Router.routers[router.constructor.name] = {
    handlers: {},
    middlewares: {},
    basePath: '/',
    app: null,
  };
};

const request = method => path => (target, key, descriptor) => {
  _createRouter(target);
  const router = Router.routers[target.constructor.name];

  const handler = [
    method,
    [path, Router.exceptionHandler(Router.handler(descriptor.value))],
  ];

  router.handlers[key] = { ...(router.handlers[key] || null), handler };
  return descriptor;
};

const applyMiddlewares = (...middlewares) => (target, key, descriptor) => {
  _createRouter(target);
  const router = Router.routers[target.constructor.name];

  router.handlers[key] = {
    ...(router.handlers[key] || {}),
    middlewares: [
      ...((router.handlers[key] || {}).middlewares || []).flat(),
      ...middlewares.flat(),
    ],
  };
  return descriptor;
};

const requiresLogin = (role = '*') =>
  applyMiddlewares([
    role === false ? NO_AUTH_MIDDLEWARE : REQUIRES_LOGIN,
    role !== false ? auth.is(role) : null,
  ]);

const routerConfig = (app, basePath) => Class => (...args) => {
  _createRouter(Class.prototype);
  Router.routers[Class.prototype.constructor.name].basePath = basePath;
  Router.routers[Class.prototype.constructor.name].app = app;
  return new Class(...args);
};

module.exports = {
  configureRouter,
  Router,
  get: request('get'),
  post: request('post'),
  put: request('put'),
  patch: request('patch'),
  remove: request('delete'),
  applyMiddlewares,
  requiresLogin,
  routerConfig,
  ApplicationError,
};
