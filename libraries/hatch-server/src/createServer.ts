import {
  AnyJsonObject,
  CompletableFuture,
  DependencyContainer,
  ErrorReporter,
  initializeInjection,
  InjectionInitializationContext,
  Logger,
  ROOT_CONTAINER,
  SentryMonitor,
  SentryReporter,
} from '@launchtray/hatch-util';
import {addBreadcrumb, Breadcrumb, captureException, init, setExtra, setTag} from '@sentry/node';
import {Options} from '@sentry/types';
import express, {Application} from 'express';
import http from 'http';
import serialize, {SerializeJSOptions} from 'serialize-javascript';
import util from 'util';
import {createLogger, format, transports} from 'winston';
import {ErrorReporterTransport} from './ErrorReporterTransport';
import {OpenAPISpec, OpenAPISpecBuilder} from './OpenAPI';
import {
  assignRootContainerToController,
  cleanUpRouting,
  CUSTOM_INFO_ROUTE,
  CUSTOM_LIVENESS_ROUTE,
  CUSTOM_OVERALL_HEALTH_ROUTE,
  CUSTOM_READINESS_ROUTE,
  hasControllerRoutes,
  HealthStatus,
  LivenessState,
  ReadinessState,
} from './server-routing';
import {ServerComposer, ServerComposition} from './ServerComposer';
import {
  registerServerMiddleware,
  resolveServerMiddleware,
  Server,
  ServerMiddleware,
} from './ServerMiddleware';

export type ServerExtension<T extends ServerComposition> =
  (server: Server, app: Application, composition: T, logger: Logger, errorReporter: ErrorReporter) => void;

export interface CreateServerOptions<T extends ServerComposition> {
  reloadComposeModule: () => {default: ServerComposer<T>};
  injectionOptions?: InjectionInitializationContext;
}

let runningServer: Server;
let runningServerApp: Application;

if (module.hot != null) {
  module.hot.dispose((data) => {
    /* eslint-disable no-param-reassign -- intentional mutation */
    data.runningServerApp = runningServerApp;
    data.runningServer = runningServer;
    /* eslint-enable no-param-reassign */
  });
  if (module.hot.data != null) {
    runningServerApp = module.hot.data.runningServerApp;
    runningServer = module.hot.data.runningServer;
  }
}

const formatObjectForLog = (obj: unknown) => {
  if (typeof obj === 'string') {
    return obj;
  }
  return util.inspect(obj, {breakLength: Infinity, compact: true});
};

const RAW_LEVEL_MAX_LENGTH = 5;
const COLORIZED_LEVEL_MAX_LENGTH = RAW_LEVEL_MAX_LENGTH + 10; // 10 = overhead length of color escape sequence
const customLogFormat = (colorized: boolean) => {
  return format.combine(
    format.timestamp(),
    {
      transform(info: {timestamp: string, level: string, message: string, meta: unknown}) {
        const {timestamp, level, message} = info;
        const args = info[Symbol.for('splat')];
        let messageWithArgs = formatObjectForLog(message);
        if (args != null) {
          messageWithArgs += ` ${args.map((obj: unknown) => {
            return formatObjectForLog(obj);
          }).join(' ')}`;
        }
        const paddedLevel = `[${level}]`.padEnd((colorized ? COLORIZED_LEVEL_MAX_LENGTH : RAW_LEVEL_MAX_LENGTH) + 2);
        // eslint-disable-next-line no-param-reassign -- using API as intended
        info[Symbol.for('message') as unknown as string] = `[${timestamp}] ${paddedLevel}: ${messageWithArgs}`;
        return info;
      },
    },
  );
};

const createServerLogger = async (appName: string) => {
  const rootContainer: DependencyContainer = ROOT_CONTAINER;
  const logger = createLogger({});
  const defaultServerLogFile = process.env.LOG_FILE ?? (`${appName}.log`);
  if (!rootContainer.isRegistered('serverLogFile')) {
    rootContainer.register('serverLogFile', {useValue: defaultServerLogFile});
  }
  const serverLogFile = await rootContainer.resolve<string>('serverLogFile');
  const defaultLogLevel = process.env.LOG_LEVEL ?? (process.env.NODE_ENV === 'development' ? 'debug' : 'info');
  if (!rootContainer.isRegistered('logLevel')) {
    rootContainer.register('logLevel', {useValue: defaultLogLevel});
  }
  const logLevel = await rootContainer.resolve<string>('logLevel');
  const colorizeLog = process.env.COLORIZE_LOG === 'true';

  if (process.env.NODE_ENV === 'development' || process.env.LOG_TO_CONSOLE === 'true') {
    logger.add(new transports.Console({
      level: logLevel,
      format: colorizeLog ? format.combine(
        format.colorize(),
        customLogFormat(true),
      ) : customLogFormat(false),
    }));
  } else {
    logger.add(new transports.File({
      filename: serverLogFile,
      level: logLevel,
      format: customLogFormat(false),
      maxsize: 10 ** 8,
      maxFiles: 5,
      zippedArchive: true,
      tailable: true,
    }));
  }
  rootContainer.registerInstance('Logger', logger);
  return logger;
};

const sentryMonitor: SentryMonitor = {
  addBreadcrumb: (breadcrumb: Breadcrumb) => {
    addBreadcrumb(breadcrumb);
  },
  captureException: (error: unknown) => {
    captureException(error);
  },
  init: (options: Options) => {
    init(options);
  },
  setExtra: (key: string, extra: unknown) => {
    setExtra(key, extra);
  },
  setTag: (key: string, value: string) => {
    setTag(key, value);
  },
};

const getLivenessStatus = async (logger: Logger, serverMiddlewareList: ServerMiddleware[]): Promise<HealthStatus> => {
  let overallStatus: HealthStatus | undefined;
  for (const serverMiddleware of serverMiddlewareList) {
    try {
      const state = await serverMiddleware.getLivenessState?.();
      if (state != null && state !== true && state !== LivenessState.CORRECT) {
        overallStatus = HealthStatus.DOWN;
      }
    } catch (err) {
      logger.error('Error during liveness check:', err);
      return HealthStatus.DOWN;
    }
  }
  return overallStatus ?? HealthStatus.UP;
};

const getReadinessStatus = async (logger: Logger, serverMiddlewareList: ServerMiddleware[]): Promise<HealthStatus> => {
  let overallStatus: HealthStatus | undefined;
  for (const serverMiddleware of serverMiddlewareList) {
    try {
      const state = await serverMiddleware.getReadinessState?.();
      if (state != null && state !== true && state !== ReadinessState.ACCEPTING_TRAFFIC) {
        overallStatus = HealthStatus.OUT_OF_SERVICE;
      }
    } catch (err) {
      logger.error('Error during readiness check:', err);
      return HealthStatus.DOWN;
    }
  }
  return overallStatus ?? HealthStatus.UP;
};

const getAppInfo = async (logger: Logger, serverMiddlewareList: ServerMiddleware[]): Promise<AnyJsonObject> => {
  let overallInfo: AnyJsonObject = {};
  for (const serverMiddleware of serverMiddlewareList) {
    try {
      overallInfo = {
        ...overallInfo,
        ...(await serverMiddleware.getAppInfo?.()),
      };
    } catch (err) {
      logger.error('Error gathering app info:', err);
    }
  }
  overallInfo.commitId = process.env.HATCH_BUILDTIME_COMMIT_ID;
  overallInfo.commitDate = process.env.HATCH_BUILDTIME_COMMIT_DATE;
  overallInfo.buildDate = process.env.HATCH_BUILDTIME_BUILD_DATE;
  overallInfo.packageVersion = process.env.HATCH_BUILDTIME_PACKAGE_VERSION;
  overallInfo.packageName = process.env.HATCH_BUILDTIME_PACKAGE_NAME;
  return overallInfo;
};

const codeForHealthStatus = (healthStatus: HealthStatus) => {
  switch (healthStatus) {
    case HealthStatus.UP:
      return 200;
    case HealthStatus.OUT_OF_SERVICE:
      return 503;
    default:
      return 500;
  }
};

const addHealthChecks = async (
  logger: Logger,
  app: Application,
  container: DependencyContainer,
  serverMiddlewareList: ServerMiddleware[],
) => {
  let healthRoute = '/api/health';
  if (container.isRegistered(CUSTOM_OVERALL_HEALTH_ROUTE)) {
    healthRoute = await container.resolve(CUSTOM_OVERALL_HEALTH_ROUTE);
  }

  if (healthRoute != null) {
    let livenessRoute = `${healthRoute}/liveness`;
    if (container.isRegistered(CUSTOM_LIVENESS_ROUTE)) {
      livenessRoute = await container.resolve(CUSTOM_LIVENESS_ROUTE);
    }

    if (livenessRoute != null) {
      app.get(livenessRoute, async (req, res) => {
        const status = await getLivenessStatus(logger, serverMiddlewareList);
        const components = {livenessProbe: {status}};
        res.setHeader('Content-Type', 'application/json');
        res.status(codeForHealthStatus(status)).send(JSON.stringify({status, components}));
      });
    }

    let readinessRoute = `${healthRoute}/readiness`;
    if (container.isRegistered(CUSTOM_READINESS_ROUTE)) {
      readinessRoute = await container.resolve(CUSTOM_READINESS_ROUTE);
    }
    if (readinessRoute != null) {
      app.get(readinessRoute, async (req, res) => {
        const status = await getReadinessStatus(logger, serverMiddlewareList);
        const components = {readinessProbe: {status}};
        res.setHeader('Content-Type', 'application/json');
        res.status(codeForHealthStatus(status)).send(JSON.stringify({status, components}));
      });
    }

    let infoRoute = `${healthRoute}/info`;
    if (container.isRegistered(CUSTOM_INFO_ROUTE)) {
      infoRoute = await container.resolve(CUSTOM_INFO_ROUTE);
    }
    if (infoRoute != null) {
      app.get(infoRoute, async (req, res) => {
        const info = await getAppInfo(logger, serverMiddlewareList);
        res.setHeader('Content-Type', 'application/json');
        res.status(200).send(JSON.stringify(info));
      });
    }

    app.get(healthRoute, async (req, res) => {
      const livenessStatus = await getLivenessStatus(logger, serverMiddlewareList);
      const readinessStatus = await getReadinessStatus(logger, serverMiddlewareList);
      const info = await getAppInfo(logger, serverMiddlewareList);
      const components = {livenessProbe: {status: livenessStatus}, readinessProbe: {status: readinessStatus}};
      const groups = ['liveness', 'readiness'];
      res.setHeader('Content-Type', 'application/json');
      if (livenessStatus !== HealthStatus.UP) {
        res.status(500).send(JSON.stringify({info, status: 'DOWN', components, groups}));
        return;
      }
      res.status(codeForHealthStatus(readinessStatus)).send(JSON.stringify({
        info,
        status: readinessStatus,
        components,
        groups,
      }));
    });
  }
};

const cleanUpHotReloading = () => {
  if (runningServer != null && runningServerApp != null) {
    runningServer.removeAllListeners('request');
    cleanUpRouting(runningServerApp, runningServer);
  }
};

const getOrCreateServer = () => {
  let newRunningServer: boolean;
  runningServerApp = express();
  if (runningServer == null) {
    runningServer = http.createServer(runningServerApp);
    newRunningServer = true;
  } else {
    newRunningServer = false;
  }
  return newRunningServer;
};

const handlePrintApiSpecMode = async (apiSpec: OpenAPISpec) => {
  if (process.env.PRINT_API_SPEC_ONLY === 'true') {
    const flushed = new CompletableFuture('stdout flushed');
    process.stdout.write(JSON.stringify(apiSpec), 'utf8', () => {
      flushed.complete();
    });
    await flushed.get();
    process.exit(0);
  }
};

const getPortAndHostname = (logger: Logger): {port: number, hostname: string | undefined} => {
  const portString = process.env.PORT ?? process.env.HATCH_BUILDTIME_PORT;
  let port: number;
  if (portString != null) {
    port = parseInt(portString, 10);
  } else {
    port = 3000;
  }
  const hostname = process.env.HOSTNAME ?? process.env.HATCH_BUILDTIME_HOSTNAME;
  if (process.env.NODE_ENV === 'development') {
    logger.info(`Listening at http://${hostname ?? '0.0.0.0'}:${port}`);
  }
  return {port, hostname};
};

const createServerAsync = async <T extends ServerComposition>(
  serverComposer: ServerComposer<T>,
  serverExtension?: ServerExtension<T>,
) => {
  cleanUpHotReloading();
  const composition: T = await serverComposer();
  const newRunningServer = getOrCreateServer();

  // Make caching opt-in for app-defined endpoints
  runningServerApp.use((req, res, next) => {
    res.setHeader('Cache-Control', 'max-age=0');
    next();
  });

  const serverMiddlewareClasses = composition.serverMiddleware ?? [];
  const rootContainer = ROOT_CONTAINER;
  const appVersion = rootContainer.isRegistered('appVersion')
    ? await rootContainer.resolve<string>('appVersion')
    : '0.0.0';
  const appName = await rootContainer.resolve<string>('appName');
  const apiSpecBuilder = new OpenAPISpecBuilder(appName, appVersion);
  const apiMetadataConsumer = apiSpecBuilder.addAPIMetadata.bind(apiSpecBuilder);

  await registerServerMiddleware(rootContainer, serverMiddlewareClasses, apiMetadataConsumer);
  const apiSpec = apiSpecBuilder.build();
  await handlePrintApiSpecMode(apiSpec);

  const logger = await createServerLogger(appName);
  const {port, hostname} = getPortAndHostname(logger);
  const errorReporter = new SentryReporter(sentryMonitor, logger, {dsn: process.env.SENTRY_DSN});
  rootContainer.registerInstance('ErrorReporter', errorReporter);
  logger.add(new ErrorReporterTransport({level: 'debug', format: format.label({label: appName})}, errorReporter));

  const serverMiddlewareList = await resolveServerMiddleware(rootContainer, logger);

  for (const serverMiddleware of serverMiddlewareList) {
    await serverMiddleware.registerBeforeRoutes?.(runningServerApp, runningServer);
  }
  await addHealthChecks(logger, runningServerApp, rootContainer, serverMiddlewareList);
  for (const serverMiddleware of serverMiddlewareList) {
    if (hasControllerRoutes(serverMiddleware.constructor)) {
      assignRootContainerToController(serverMiddleware, rootContainer);
    }
    await serverMiddleware.register?.(runningServerApp, runningServer);
  }
  for (const serverMiddleware of serverMiddlewareList) {
    await serverMiddleware.registerAfterRoutes?.(runningServerApp, runningServer);
  }

  if (process.env.ENABLE_API_SPEC === 'true') {
    runningServerApp.get('/api.json', (req, res) => {
      res.setHeader('Content-Type', 'application/json');
      const options: SerializeJSOptions = {unsafe: true, isJSON: true};
      if (req.query.pretty != null) {
        options.space = 2;
      }
      res.status(200).send(serialize(apiSpec, options));
    });
  }

  serverExtension?.(runningServer, runningServerApp, composition, logger, errorReporter);

  if (newRunningServer) {
    runningServer
      .listen(port, hostname)
      .on('error', (err: Error) => {
        // eslint-disable-next-line no-console -- intentional error log to console
        console.error(err);
      });
  } else {
    runningServer.on('request', runningServerApp);
  }
};

export default <T extends ServerComposition>(options: CreateServerOptions<T>, serverExtension?: ServerExtension<T>) => {
  initializeInjection(options.injectionOptions);
  const serverComposer = options.reloadComposeModule().default;
  createServerAsync(serverComposer, serverExtension).catch((err) => {
    // eslint-disable-next-line no-console -- intentional error log to console
    console.error(err);
  });
};
