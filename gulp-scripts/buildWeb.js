const { exec } = require('child_process');
const fse = require('fs-extra');
const path = require('path');

function buildWeb(cb) {
  exec('npm run build', { cwd: path.join(process.cwd(), 'web') }, (err, stdout, stderr) => {
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
