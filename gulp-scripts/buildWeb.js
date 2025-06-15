const { exec } = require('child_process');
const fse = require('fs-extra');
const path = require('path');
const { series } = require('gulp');

function buildWeb(cb) {
  exec('npm run build', { cwd: path.join(process.cwd(), 'web') }, (err, stdout, stderr) => {
    console.log(stdout);
    console.error(stderr);
    cb(err);
  });
}

function gitInit(cb) {
  exec('git init', { cwd: path.join(process.cwd(), 'web','build') }, (err, stdout, stderr) => {
    console.log(stdout);
    console.error(stderr);
    cb(err);
  });
}

function gitRemote(cb) {
  exec('git remote add origin https://github.com/XZLTO/pakivpn.github.io.git', { cwd: path.join(process.cwd(), 'web','build') }, (err, stdout, stderr) => {
    console.log(stdout);
    console.error(stderr);
    cb(err);
  });
}

function gitBranch(cb) {
  exec('git branch -M main', { cwd: path.join(process.cwd(), 'web','build') }, (err, stdout, stderr) => {
    console.log(stdout);
    console.error(stderr);
    cb(err);
  });
}

function gitAdd(cb) {
  exec('git add --all', { cwd: path.join(process.cwd(), 'web','build') }, (err, stdout, stderr) => {
    console.log(stdout);
    console.error(stderr);
    cb(err);
  });
}

function gitCommit(cb) {
  exec('git commit -m "Update"', { cwd: path.join(process.cwd(), 'web','build') }, (err, stdout, stderr) => {
    console.log(stdout);
    console.error(stderr);
    cb(err);
  });
}
function gitPush(cb) {
  exec('git push -f -u origin main', { cwd: path.join(process.cwd(), 'web','build') }, (err, stdout, stderr) => {
    console.log(stdout);
    console.error(stderr);
    cb(err);
  });
}

function copyWeb(cb, to) {
  try {
    const source = path.join(process.cwd(), 'web/build');
    const destination = path.join(process.cwd(), to);
    fse.copySync(source, destination, { overwrite: true });
    cb();
  }
  catch (err) {
    cb(err);
  }
}

exports.copyWeb = copyWeb;
exports.buildWeb = buildWeb;
exports.publishWeb = series(buildWeb,gitInit,gitRemote,gitBranch,gitAdd,gitCommit,gitPush);
