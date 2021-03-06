'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

exports.default = function (configDirPath) {
  var headHtmlPath = _path2.default.resolve(configDirPath, 'head.html');
  var headHtml = '';
  if (_fs2.default.existsSync(headHtmlPath)) {
    headHtml = _fs2.default.readFileSync(headHtmlPath, 'utf8');
  }

  return headHtml;
};

var _path = require('path');

var _path2 = _interopRequireDefault(_path);

var _fs = require('fs');

var _fs2 = _interopRequireDefault(_fs);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }