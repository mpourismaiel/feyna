const express = require('express');
const { Router, routerConfig, get, configureRouter } = require('../');

const app = express();

configureRouter({ secret: 'secret_key' });

@routerConfig(app, '/test')
class TestRouter extends Router {
  @get('/')
  index() {
    return { message: 'Hello World' };
  }
}

new TestRouter();
app.listen(3000, () => console.log('Running'));
