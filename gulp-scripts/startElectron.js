const { series } = require('gulp');
const { spawn, ChildProcess } = require('child_process');
let webProcess, electronProcess;

const processes = []

function createProcess(command, args, options) {
  const process = spawn(command, args, options);
  processes.push(process)
  return process;
}

function killAll() {
  processes.forEach(process => {
    process.exit(0)
  });
}

function startWeb(cb) {
  webProcess = createProcess('npm', ['start'], { cwd: './web', stdio: 'inherit', shell: true });
  webProcess.on('close', code => {
    if (code !== 0) cb(new Error(`web exited with code ${code}`));
  });

  cb();
}

function startElectron(cb) {
  electronProcess = createProcess('npm', ['start'], {
    cwd: './electron',
    stdio: 'inherit',
    shell: true,
    env: { ...process.env, DEV_WEB_URL: 'http://localhost:3000' }
  });
  electronProcess.on('close', code => {
    if (code !== 0) cb(new Error(`electron exited with code ${code}`));
  });
  cb();
}

exports.startElectron = series(startWeb, startElectron);