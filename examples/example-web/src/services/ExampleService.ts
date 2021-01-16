import {
  inject,
  injectable,
  Logger,
} from '@launchtray/hatch-util';

@injectable()
export default class ExampleService {
  constructor(@inject('Logger') private logger: Logger) {

  }

  public go() {
    this.logger.debug('Go!');
  }
}
