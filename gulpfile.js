const { series } = require('gulp');
const { buildAndroid, copyWebToAndroid } = require('./gulp-scripts/buildAndroid');
const { buildWeb } = require('./gulp-scripts/buildWeb');
const { buildElectron, copyWebToElectron } = require('./gulp-scripts/buildElectron');
const { startElectron } = require('./gulp-scripts/startElectron');

exports['start:electron'] = startElectron;
exports['build:android'] = series(buildWeb,buildAndroid);
exports['build:electron'] = series(buildWeb,buildElectron);
exports['build:web'] = buildWeb;
exports['web:copyAndroid'] = copyWebToAndroid;
exports['web:copyElectron'] = copyWebToElectron;
exports.build = series(buildWeb, buildAndroid, buildElectron);