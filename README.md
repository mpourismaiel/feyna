### Installation

Install the following dependencies:

```bash
npm install feyna express express-jwt @babel/cli @babel/core @babel/node @babel/plugin-proposal-class-properties @babel/plugin-proposal-decorators @babel/preset-env
```

Please add the following to your `.babelrc`:

```json
{
  "presets": ["@babel/preset-env"],
  "plugins": [
    ["@babel/plugin-proposal-decorators", { "legacy": true }],
    "@babel/plugin-proposal-class-properties"
  ]
}
```

And also you need to set `process.env.JWT_SECRET`.

### Usage

```
const express = require('express');
const { Router, routerConfig, get, configureRouter } = require('feyna');

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
```
