import {
  delay,
  initializer,
  inject,
  injectable,
  Logger,
  getAlternateAction,
  isApiError,
} from '@launchtray/hatch-util';
import {
  effects,
  onClientLoad,
  onInit,
  onLocationChange,
  runtimeConfig,
  webAppManager,
} from '@launchtray/hatch-web';
import {LocationChangeContext} from '@launchtray/hatch-web-injectables';
import {
  CreateUserXRoleEnum,
  isCreateUserHttpResponseBodyFor201,
  isCreateUserHttpResponseBodyFor200,
  MetricsApi,
  MetricsApiInjectionToken,
  ReportApi,
  ReportApiInjectionToken,
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

const convertStreamToString = async (readableStream: ReadableStream): Promise<string> => {
  const reader = readableStream.getReader();
  let toReturn = '';
  try {
    let readResult: { done: boolean, value?: Uint8Array } = await reader.read();
    while (!readResult.done) {
      if (readResult.value != null) {
        toReturn += Buffer.from(readResult.value).toString();
      }
      readResult = await reader.read();
    }
  } finally {
    reader.releaseLock();
  }
  return toReturn;
};

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
    logger.debug('Constructing ExampleManager 2');
    this.dependency = dependency;
  }

  // Example of API-dependent code that works both client and server-side
  @initializer()
  private async initialize() {
    try {
      this.logger.info('sending createUser 1 request');
      const createUserRsp1 = await this.userApi.createUser({
        headers: {
          xRole: CreateUserXRoleEnum.Admin,
        },
        body: {
          firstName: 'New',
          lastName: 'Dude',
        },
      });
      this.logger.info('createUser response 1 received', createUserRsp1);
      if (isCreateUserHttpResponseBodyFor201(createUserRsp1)) {
        this.logger.info(`Created user 1 with role: ${createUserRsp1.role}`);
      } else if (isCreateUserHttpResponseBodyFor200(createUserRsp1)) {
        this.logger.info(`User 1 already existed: ${createUserRsp1.id}`);
      } else {
        this.logger.info('No content for user 1');
      }
      this.logger.info('sending createUser 1 request');
      const createUserRsp2 = await this.userApi.createUser({
        headers: {
          xRole: CreateUserXRoleEnum.Admin,
        },
        body: {
          firstName: 'Existing',
          lastName: 'Dude',
        },
      });
      this.logger.info('createUser response 2 received', createUserRsp2);
      if (isCreateUserHttpResponseBodyFor201(createUserRsp2)) {
        this.logger.info(`Created user 2 with role: ${createUserRsp2.role}`);
      } else if (isCreateUserHttpResponseBodyFor200(createUserRsp2)) {
        this.logger.info(`User 2 already existed: ${createUserRsp2.id}`);
      } else {
        this.logger.info('No content for user 2');
      }
      this.logger.info('sending createUser 1 request');
      const createUserRsp3 = await this.userApi.createUser({
        headers: {
          xRole: CreateUserXRoleEnum.Admin,
        },
        body: {
          firstName: 'None',
          lastName: 'Dude',
        },
      });
      this.logger.info('createUser response 3 received', createUserRsp3);
      if (isCreateUserHttpResponseBodyFor201(createUserRsp3)) {
        this.logger.info(`Created user 3 with role: ${createUserRsp3.role}`);
      } else if (isCreateUserHttpResponseBodyFor200(createUserRsp3)) {
        this.logger.info(`User 3 already existed: ${createUserRsp3.id}`);
      } else {
        this.logger.info('No content for user 3');
      }
      const getReportRsp = await this.reportApi.getReportPdf({
        queryParams: {
          // Uncomment to trigger error case: // timestamp: new Date(),
          startDate: new Date(),
        },
      });
      const body = await convertStreamToString(getReportRsp);
      this.logger.info(`getReportPdf response received: ${body}`);
    } catch (err: unknown) {
      if (isApiError(err)) {
        const altAction = getAlternateAction(err);
        const body = await convertStreamToString(altAction.body as ReadableStream);
        this.logger.error(`ExampleManager.initialize error: ${body}`);
      } else {
        this.logger.error('ExampleManager.initialize error', err);
      }
    }
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

  @onInit()
  public* handleInit() {
    this.logger.info('ON INIT Runtime config:', runtimeConfig);
  }
}
