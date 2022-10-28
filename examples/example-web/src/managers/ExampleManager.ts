import {
  delay, initializer,
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
import {
  MetricsApi,
  MetricsApiInjectionToken, ReportApi, ReportApiInjectionToken,
  TestersApi,
  TestersApiInjectionToken,
  UsersApi,
  UsersApiInjectionToken,
} from '@launchtray/example-client-sdk';

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
  constructor(
    private dependency: ExampleDependencyForManager,
    @inject(UsersApiInjectionToken) private userApi: UsersApi,
    @inject(TestersApiInjectionToken) private testersApi: TestersApi,
    @inject(MetricsApiInjectionToken) private metricsApi: MetricsApi,
    @inject(ReportApiInjectionToken) private reportApi: ReportApi,
    @inject('Logger') private logger: Logger,
  ) {
    logger.debug('Constructing ExampleManager');
    this.dependency = dependency;
  }

  @initializer()
  private async initialize() {
    const response = await this.reportApi.getReportPdf({
      headers: {},
      queryParams: {
        startDate: new Date(),
      },
    });

    const reader = response.getReader();
    let body = '';
    try {
      let readResult: {done: boolean, value?: Uint8Array} = await reader.read();
      while (!readResult.done) {
        if (readResult.value != null) {
          body += Buffer.from(readResult.value).toString();
        }
        readResult = await reader.read();
      }
    } finally {
      reader.releaseLock();
    }

    this.logger.info(`getReportPdf response received: ${body}`);
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
