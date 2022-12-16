import commander from 'commander';
import {clientSdkCreator, runCommander} from '../../util';

commander
  .name('hatch client-sdk')
  .option('-n, --name <name>', 'The client SDK package name. Defaults to <dependency>-sdk if '
    + 'generating from a dependency, else required', null)
  .option('-d, --dependency <dependency>', 'The hatch api dependency name to '
    + 'generate the OpenAPI spec', null)
  .option('-v, --ver <ver>', 'The hatch api dependency version to generate the '
    + 'OpenAPI spec. Defaults to \"latest\"', null)
  .option('-s, --spec <spec>', 'The location of the OpenAPI spec, as URL or file', null)
  .description('Creates a client-sdk project from an OpenAPI Specification')
  .action(clientSdkCreator(__dirname, 'libraries'));

runCommander();
