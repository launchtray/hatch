#!/usr/bin/env node

import commander from 'commander';
import {runCommander} from './util';

const optionsForTemplate = (name: string) => ({
  executableFile: 'templates/' + name + '/command.js'
});

const commandForTemplate = (name: string, description: string): [string, string, commander.CommandOptions] => [
  name + ' <name>',
  'creates a ' + description,
  optionsForTemplate(name)
];

commander
  .command(...commandForTemplate('webapp', 'web application project'))
  .command(...commandForTemplate('microservice', 'microservice project'))
  .command(...commandForTemplate('component', 'component module'))
  .command(...commandForTemplate('container', 'container module'))
  .command(...commandForTemplate('controller', 'controller module'))
  .command(...commandForTemplate('manager', 'manager module'))
  .command(...commandForTemplate('reducer', 'reducer module'))
  .command(...commandForTemplate('injectable', 'injectable module'))
  .command(...commandForTemplate('story', 'storybook story'))
;

runCommander();
