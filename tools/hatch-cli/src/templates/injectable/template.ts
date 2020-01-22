import {
  inject,
  injectable,
  Logger
} from '@launchtray/hatch-util';

@injectable()
export default class HATCH_CLI_TEMPLATE_VAR_moduleName {

  constructor(@inject('Logger') private logger: Logger) {

  }
}
