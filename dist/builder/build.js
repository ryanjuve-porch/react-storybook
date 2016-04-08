#!/usr/bin/env node
'use strict';

var _toConsumableArray2 = require('babel-runtime/helpers/toConsumableArray');

var _toConsumableArray3 = _interopRequireDefault(_toConsumableArray2);

var _extends2 = require('babel-runtime/helpers/extends');

var _extends3 = _interopRequireDefault(_extends2);

var _webpack = require('webpack');

var _webpack2 = _interopRequireDefault(_webpack);

var _commander = require('commander');

var _commander2 = _interopRequireDefault(_commander);

var _path = require('path');

var _path2 = _interopRequireDefault(_path);

var _fs = require('fs');

var _fs2 = _interopRequireDefault(_fs);

var _shelljs = require('shelljs');

var _shelljs2 = _interopRequireDefault(_shelljs);

var _package = require('../../package.json');

var _package2 = _interopRequireDefault(_package);

var _webpack3 = require('./webpack.config');

var _webpack4 = _interopRequireDefault(_webpack3);

var _index = require('../server/index.html');

var _index2 = _interopRequireDefault(_index);

var _iframe = require('../server/iframe.html');

var _iframe2 = _interopRequireDefault(_iframe);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

process.env.NODE_ENV = 'production';

var logger = console;

_commander2.default.version(_package2.default.version).option('-s, --static-dir [dir-name]', 'Directory where to load static files from').option('-o, --output-dir [dir-name]', 'Directory where to store built files').option('-c, --config-dir [dir-name]', 'Directory where to load Storybook configurations from').parse(process.argv);

// create the output directory if not exists
var outputDir = _commander2.default.outputDir || './storybook-build';
var outputDirPath = _path2.default.resolve(outputDir);
_shelljs2.default.mkdir('-p', _path2.default.resolve(outputDirPath, 'static'));

if (_commander2.default.staticDir) {
  var staticPath = _path2.default.resolve(_commander2.default.staticDir);
  if (_fs2.default.existsSync(staticPath)) {
    logger.log('=> Copying static files from: ' + _commander2.default.staticDir);
    _shelljs2.default.cp('-r', staticPath + '/', outputDirPath);
  } else {
    logger.error('Error: no such directory to load static files: ' + staticPath);
    process.exit(-1);
  }
}

// add config path to the entry
var configDir = _commander2.default.configDir || './.storybook';
var configDirPath = _path2.default.resolve(configDir);

// load babelrc file.
var babelrcPath = _path2.default.resolve('./.babelrc');
if (_fs2.default.existsSync(babelrcPath)) {
  logger.info('=> Using custom .babelrc configurations.');
  var babelrcContent = _fs2.default.readFileSync(babelrcPath);
  try {
    var babelrc = JSON.parse(babelrcContent);
    _webpack4.default.module.loaders[0].query = babelrc;
  } catch (ex) {
    logger.error('=> Error parsing .babelrc file: ' + ex.message);
    throw ex;
  }
}

var storybookConfigPath = _path2.default.resolve(configDirPath, 'config.js');
if (!_fs2.default.existsSync(storybookConfigPath)) {
  logger.error('=> Create a storybook config file in "' + configDir + '/config.js".\n');
  process.exit(0);
}
_webpack4.default.entry.preview.push(storybookConfigPath);

// load custom webpack configurations
var customConfigPath = _path2.default.resolve(configDirPath, 'webpack.config.js');
var finalConfig = _webpack4.default;
if (_fs2.default.existsSync(customConfigPath)) {
  var customConfig = require(customConfigPath);
  logger.info('=> Loading custom webpack config.');
  finalConfig = (0, _extends3.default)({}, customConfig, _webpack4.default, {
    // We need to use our and custom plugins.
    plugins: [].concat((0, _toConsumableArray3.default)(_webpack4.default.plugins), (0, _toConsumableArray3.default)(customConfig.plugins || [])),
    module: (0, _extends3.default)({}, _webpack4.default.module, {
      // We need to use our and custom loaders.
      loaders: [].concat((0, _toConsumableArray3.default)(_webpack4.default.module.loaders), (0, _toConsumableArray3.default)(customConfig.module.loaders || []))
    })
  });
}

// write both the storybook UI and IFRAME HTML files to destination path
_fs2.default.writeFileSync(_path2.default.resolve(outputDirPath, 'index.html'), (0, _index2.default)());
_fs2.default.writeFileSync(_path2.default.resolve(outputDirPath, 'iframe.html'), (0, _iframe2.default)());

// compile all other resources and write them to disk
// TODO this section of the code needs to be verified
//      by running with a few different scenarios.
(0, _webpack2.default)(finalConfig).compile(function (err, stats) {
  for (var filename in stats.assets) {
    if (!stats.assets.hasOwnProperty(filename)) {
      continue;
    }

    var asset = stats.assets[filename];
    if (asset.children && asset.children.length) {
      // TODO learn more about "RawSource"
      var _source = asset.children[0]._value;
      var _dstPath = _path2.default.resolve(outputDirPath, 'static/' + filename);
      _fs2.default.writeFileSync(_dstPath, _source);
      continue;
    }

    var source = asset._value;
    var dstPath = _path2.default.resolve(outputDirPath, 'static/' + filename);
    _fs2.default.writeFileSync(dstPath, source);
  }
});