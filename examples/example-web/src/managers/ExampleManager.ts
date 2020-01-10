import {
  delay,
  inject,
  injectable,
  Logger,
} from '@launchtray/hatch-util';
import {
  effects,
  LocationChangeContext,
  onClientLoad,
  onLocationChange,
  webAppManager,
} from '@launchtray/hatch-web';

@injectable()
export class ExampleDependencyForManager {
  constructor(@inject('Logger') private logger: Logger) {
    logger.debug('Constructing ExampleDependencyForSagas');
    this.logger = logger;
  }

  public getResult() {
    this.logger.info('Getting result');
    return 'Result';
  }
}

// Note: example only
// tslint:disable-next-line:max-classes-per-file
@webAppManager()
export default class ExampleManager {
  constructor(private dependency: ExampleDependencyForManager, @inject('Logger') private logger: Logger) {
    logger.debug('Constructing ExampleManager');
    this.dependency = dependency;
  }

  @onLocationChange()
  public *handleEveryLocationChange() {
    yield *effects.call([this.logger, this.logger.info], 'ExampleManager.handleEveryLocationChange');
    yield effects.put({type: 'TEST_ACTION.handleEveryLocationChange'});
  }

  @onLocationChange({path: '/:route'})
  public async prepRoute(context: LocationChangeContext<{route: string}>) {
    const route = context.pathMatch.params.route;
    this.logger.info('ExampleManager.prepRoute delaying...');
    await delay(100);
    context.store.dispatch({type: 'TEST_ACTION.prepRoute'});
    this.logger.info('ExampleManager.prepRoute', {route, location: context.location});
  }

  @onLocationChange('/:page')
  public async prepPage({pathMatch, location, store}: LocationChangeContext) {
    this.logger.info('ExampleManager.prepPage', {pathMatch, location});
  }

  @onClientLoad()
  public *handleClientLoad() {
    while (true) {
      yield effects.delay(5000);
      yield effects.put({type: 'ExampleManager3Action', payload: {result: this.dependency.getResult()}});
    }
  }
}
