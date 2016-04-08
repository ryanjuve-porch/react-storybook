#!/usr/bin/env node

process.env.NODE_ENV = 'production';

import webpack from 'webpack';
import program from 'commander';
import path from 'path';
import fs from 'fs';
import shelljs from 'shelljs';
import packageJson from '../../package.json';
import config from './webpack.config';
import getIndexHtml from '../server/index.html';
import getIframeHtml from '../server/iframe.html';

const logger = console;

program
  .version(packageJson.version)
  .option('-s, --static-dir [dir-name]', 'Directory where to load static files from')
  .option('-o, --output-dir [dir-name]', 'Directory where to store built files')
  .option('-c, --config-dir [dir-name]', 'Directory where to load Storybook configurations from')
  .parse(process.argv);

// create the output directory if not exists
const outputDir = program.outputDir || './storybook-build';
const outputDirPath = path.resolve(outputDir);
shelljs.mkdir('-p', path.resolve(outputDirPath, 'static'));

if (program.staticDir) {
  const staticPath = path.resolve(program.staticDir);
  if (fs.existsSync(staticPath)) {
    logger.log(`=> Copying static files from: ${program.staticDir}`);
    shelljs.cp('-r', `${staticPath}/`, outputDirPath);
  } else {
    logger.error(`Error: no such directory to load static files: ${staticPath}`);
    process.exit(-1);
  }
}

// add config path to the entry
const configDir = program.configDir || './.storybook';
const configDirPath = path.resolve(configDir);

// load babelrc file.
const babelrcPath = path.resolve('./.babelrc');
if (fs.existsSync(babelrcPath)) {
  logger.info('=> Using custom .babelrc configurations.');
  const babelrcContent = fs.readFileSync(babelrcPath);
  try {
    const babelrc = JSON.parse(babelrcContent);
    config.module.loaders[0].query = babelrc;
  } catch (ex) {
    logger.error(`=> Error parsing .babelrc file: ${ex.message}`);
    throw ex;
  }
}

const storybookConfigPath = path.resolve(configDirPath, 'config.js');
if (!fs.existsSync(storybookConfigPath)) {
  logger.error(`=> Create a storybook config file in "${configDir}/config.js".\n`);
  process.exit(0);
}
config.entry.preview.push(storybookConfigPath);

// load custom webpack configurations
const customConfigPath = path.resolve(configDirPath, 'webpack.config.js');
let finalConfig = config;
if (fs.existsSync(customConfigPath)) {
  const customConfig = require(customConfigPath);
  logger.info('=> Loading custom webpack config.');
  finalConfig = {
    ...customConfig,
    // We'll always load our configurations after the custom config.
    // So, we'll always load the stuff we need.
    ...config,
    // We need to use our and custom plugins.
    plugins: [
      ...config.plugins,
      ...customConfig.plugins || [],
    ],
    module: {
      ...config.module,
      // We need to use our and custom loaders.
      loaders: [
        ...config.module.loaders,
        ...customConfig.module.loaders || [],
      ],
    },
  };
}

// write both the storybook UI and IFRAME HTML files to destination path
fs.writeFileSync(path.resolve(outputDirPath, 'index.html'), getIndexHtml());
fs.writeFileSync(path.resolve(outputDirPath, 'iframe.html'), getIframeHtml());

// compile all other resources and write them to disk
// TODO this section of the code needs to be verified
//      by running with a few different scenarios.
webpack(finalConfig).compile(function (err, stats) {
  for (const filename in stats.assets) {
    if (!stats.assets.hasOwnProperty(filename)) {
      continue;
    }

    const asset = stats.assets[filename];
    if (asset.children && asset.children.length) {
      // TODO learn more about "RawSource"
      const source = asset.children[0]._value;
      const dstPath = path.resolve(outputDirPath, `static/${filename}`);
      fs.writeFileSync(dstPath, source);
      continue;
    }

    const source = asset._value;
    const dstPath = path.resolve(outputDirPath, `static/${filename}`);
    fs.writeFileSync(dstPath, source);
  }
});
