import {
  delay,
  inject,
  injectable,
  Logger,
} from '@launchtray/hatch-util';
import {
  effects,
  onClientLoad,
  onLocationChange,
  runtimeConfig,
  webAppManager,
} from '@launchtray/hatch-web';
import {LocationChangeContext} from '@launchtray/hatch-web-injectables';

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
  public* handleEveryLocationChange() {
    yield* effects.call([this.logger, this.logger.info], 'ExampleManager.handleEveryLocationChange');
    yield effects.put({type: 'TEST_ACTION.handleEveryLocationChange'});
  }

  @onLocationChange({path: '/hi'})
  public async prepHI(context: LocationChangeContext<{route: string}>) {
    this.logger.info(`HELLO, WORLD. Cookie: ${context.cookie}`);
  }

  @onLocationChange({path: '/:route'})
  public async prepRoute(context: LocationChangeContext<{route: string}>) {
    const {route} = context.pathMatch.params;
    this.logger.info('ExampleManager.prepRoute delaying...');
    await delay(100);
    context.store.dispatch({type: 'TEST_ACTION.prepRoute'});
    this.logger.info('ExampleManager.prepRoute', {route, location: context.location});
  }

  @onLocationChange('/:page')
  public async prepPage({pathMatch, location}: LocationChangeContext) {
    this.logger.info('ExampleManager.prepPage', {pathMatch, location});
  }

  @onLocationChange({path: '/client', runOnClientLoad: true})
  public prepRunOnClientLoad({isServer}: LocationChangeContext) {
    this.logger.info('ExampleManager.prepRunOnClientLoad', {isServer});
  }

  @onClientLoad()
  public* handleClientLoad() {
    this.logger.info('Runtime config:', runtimeConfig);
    while (true) {
      yield effects.delay(5000);
      yield effects.put({type: 'ExampleManager3Action', payload: {result: this.dependency.getResult()}});
    }
  }
}
