const { series } = require('gulp');
const { exec, execSync } = require('child_process');
const path = require('path');
const os = require('os');
const { copyWeb } = require('./buildWeb');

function makeAndroidLib(cb) {
  if (os.type() != "Windows_NT")
    exec('./run lib core', { cwd: path.join(process.cwd(), 'android') }, (err, stdout, stderr) => {
      console.log(stdout);
      console.error(stderr);
      cb(err);
    });
  else cb(console.warn("AndroidLib:Unsuported OS"))
}

function copyWebToAndroid(cb) {
  copyWeb(cb, './android/app/src/main/assets/web');
}

function makeAndroid(cb) {
  exec('./gradlew build -PformNPM', { cwd: path.join(process.cwd(), 'android') }, (err, stdout, stderr) => {
    console.log(stdout);
    console.error(stderr);
    cb(err);
  });
}

function buildAndroid(cb) {
  return series(copyWebToAndroid, makeAndroidLib, makeAndroid)(cb);
}

module.exports = {
  buildAndroid,
  copyWebToAndroid,
};
