const { version, description } = require('./package.json');

const { ArgumentParser } = require('argparse');

const { ArgBuilder } = require('./api/ArgBuilder');
const { ColorController } = require('./api/ColorController');
const { DeviceController } = require('./api/DeviceController');
const { SettingsController } = require('./api/SettingsController');
const { ApiController } = require('./api/ApiController');

const chalk = require('chalk');
const process = require('process');

const express = require('express');
const bodyParser = require('body-parser');
const app = express();

const parser = new ArgumentParser({
  description: description
});

let args = new ArgBuilder(parser).getArgs();

let main = new ApiController();
let devices = DeviceController.create('./dump/devices.json.b64');
let color = ColorController.create('./dump/color.json.b64', devices);


process.on('uncaughtException', (e) => {
  console.error('Exception failsafe: skipping uncaught exception =>', e);
});

/**
 * @returns URL converted to API endpoint URL.
 */
let api = (url) => {
  return `/api/${url}`;
}

/**
 * Log Express requests.
 * @param {express.Request} req the request
 * @param {express.Response} res the response
 * @param {express.NextFunction} next the next function
 */
let log = (req, isAllowed) => {
  let color = isAllowed ? chalk.blue : chalk.red;
  console.log(chalk.yellow(req.method), color(req.url), new Date().toLocaleString());
  // console.log('\x1b[36m%s\x1b[0m' + req.url, new Date().toLocaleTimeString() + ' '); // magic
}

/**
 * Authenticate incoming requests.
 * @param {express.Request} req the request
 * @param {express.Response} res the response
 * @param {express.NextFunction} next the next function
 */
let auth = (req, res, next) => {
  if(!req.headers.authorization && SettingsController.authNeeded()) {
    res.status(401).send(main.response({
      message: 'No authorization header supplied. Please try again using a valid authorization header.',
      status: 'failed'
    }));
    log(req, false);
  } else {
    if(SettingsController.checkAuth(req.headers.authorization)) {
      log(req, true);
      next();
    } else {
      log(req, false);
      res.status(403).send(main.response({
        message: 'The authorization header is incorrect. Please try again using a valid authorization header.',
        status: 'failed'
      }));
    }
  }
}



app.use(bodyParser.urlencoded({
  extended: true
}));

app.get(api('color'), auth, (req, res) => color.get(req, res));
app.post(api('color'), auth, (req, res) => color.set(req, res));
app.delete(api('color'), auth, (req, res) => color.off(req, res));
app.put(api('color'), auth, (req, res) => color.on(req, res));

app.get(api('available'), auth, (req, res) => devices.available(req, res));

app.get(api('list'), auth, (req, res) => devices.list(req, res));
app.post(api('list'), auth, (req, res) => devices.add(req, res));
app.delete(api('list'), auth, (req, res) => devices.remove(req, res));


app.listen(args['port'], () => console.log(`Apollo ${version} is listening on *:${args['port']}!`));