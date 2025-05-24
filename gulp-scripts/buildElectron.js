const { exec } = require('child_process');
const path = require('path');
const { copyWeb, buildWeb } = require('./buildWeb');
const { series } = require('gulp');

function copyWebToElectron(cb) {
  copyWeb(cb, './electron/web');
}

function makeElectron(cb) {
  exec('npm run make', { cwd: path.join(process.cwd(), 'electron') }, (err, stdout, stderr) => {
    console.log(stdout);
    console.error(stderr);
    cb(err);
  });
}

function buildElectron(cb) {
  return series(copyWebToElectron, makeElectron)(cb);
}

module.exports = {
  copyWebToElectron,
  buildElectron,
};
