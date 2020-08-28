import {
  DependencyContainer,
  ErrorReporter,
  initializeInjection,
  InjectionInitializationContext,
  Logger,
  ROOT_CONTAINER,
  SentryMonitor,
  SentryReporter,
} from '@launchtray/hatch-util';
import {
  addBreadcrumb,
  Breadcrumb,
  captureException,
  init,
  setExtra,
  setTag} from '@sentry/node';
import {Options} from '@sentry/types';
import express, {Application} from 'express';
import http from 'http';
import serialize, {SerializeJSOptions} from 'serialize-javascript';
import util from 'util';
import {createLogger, format, transports} from 'winston';
import {ErrorReporterTransport} from './ErrorReporterTransport';
import {assignRootContainerToController, cleanUpRouting, hasControllerRoutes} from './server-routing';
import {
  ServerComposer,
  ServerComposition,
} from './ServerComposer';
import {registerServerMiddleware, resolveServerMiddleware, Server} from './ServerMiddleware';
import {OpenAPISpecBuilder} from './OpenAPI';

export type ServerExtension<T extends ServerComposition> =
  (server: Server, app: Application, composition: T, logger: Logger, errorReporter: ErrorReporter) => void;

export interface CreateServerOptions<T extends ServerComposition> {
  reloadComposeModule: () => {default: ServerComposer<T>};
  injectionOptions?: InjectionInitializationContext;
}

let runningServer: Server;
let runningServerApp: Application;

if (module.hot) {
  module.hot.dispose((data) => {
    data.runningServerApp = runningServerApp;
    data.runningServer = runningServer;
  });
  if (module.hot.data) {
    runningServerApp = module.hot.data.runningServerApp;
    runningServer = module.hot.data.runningServer;
  }
}

const formatObjectForLog = (obj: any) => {
  if (typeof obj === 'string') {
    return obj;
  }
  return util.inspect(obj, {breakLength: Infinity, compact: true});
};

const customLogFormat = (tag: string) => {
  return format.combine(
    format.label({label: tag}),
    format.timestamp(),
    {
      transform(info: any) {
        const {timestamp, level, label, message} = info;
        const args = info[Symbol.for('splat')];
        let messageWithArgs = formatObjectForLog(message);
        if (args != null) {
          messageWithArgs += ' ' + args.map((obj: any) => {
            return formatObjectForLog(obj);
          }).join(' ');
        }
        info[Symbol.for('message')] = `[${timestamp}] [${label}] [${level}]: ${messageWithArgs}`;
        return info;
      }
    },
  );
};

const createServerLogger = async (appName: string) => {
  const rootContainer: DependencyContainer = ROOT_CONTAINER;
  const logger = createLogger({});
  const defaultServerLogFile = process.env.LOG_FILE ?? (appName + '.log');
  if (!rootContainer.isRegistered('serverLogFile')) {
    rootContainer.register('serverLogFile', {useValue: defaultServerLogFile});
  }
  const serverLogFile = await rootContainer.resolve<string>('serverLogFile');
  const defaultLogLevel = process.env.LOG_LEVEL ?? process.env.NODE_ENV === 'development' ? 'debug' : 'info';
  if (!rootContainer.isRegistered('logLevel')) {
    rootContainer.register('logLevel', {useValue: defaultLogLevel});
  }
  const logLevel = await rootContainer.resolve<string>('logLevel');

  if (process.env.NODE_ENV === 'development' || process.env.LOG_TO_CONSOLE === 'true') {
    logger.add(new transports.Console({
      level: logLevel,
      format: format.combine(
        format.colorize(),
        customLogFormat(appName),
      ),
    }));
  } else {
    logger.add(new transports.File({
      filename: serverLogFile,
      level: logLevel,
      format: customLogFormat(appName),
      maxsize: 10 ** 8,
      maxFiles: 5,
      zippedArchive: true,
      tailable: true
    }));
  }
  rootContainer.registerInstance('Logger', logger);
  return logger;
};

const sentryMonitor: SentryMonitor = {
  addBreadcrumb: (breadcrumb: Breadcrumb) => { addBreadcrumb(breadcrumb); },
  captureException: (error: any) => { captureException(error); },
  init: (options: Options) => { init(options); },
  setExtra: (key: string, extra: any) => { setExtra(key, extra); },
  setTag: (key: string, value: string) => { setTag(key, value); },
};

const dsn: string | undefined = process.env.SENTRY_DSN;

const createServerAsync = async <T extends ServerComposition>(
  serverComposer: ServerComposer<T>,
  serverExtension?: ServerExtension<T>,
) => {
  if (runningServer != null && runningServerApp != null) {
    runningServer.removeAllListeners('request');
    cleanUpRouting(runningServerApp, runningServer);
  }
  const composition: T = await serverComposer();

  runningServerApp = express();
  let newRunningServer: boolean;
  if (runningServer == null) {
    runningServer = http.createServer(runningServerApp);
    newRunningServer = true;
  } else {
    newRunningServer = false;
  }

  // Make caching opt-in for app-defined endpoints
  runningServerApp.use((req, res, next) => {
    res.setHeader('Cache-Control', 'max-age=0');
    next();
  });

  const serverMiddlewareClasses = composition.serverMiddleware ?? [];
  const rootContainer = ROOT_CONTAINER;

  const appName = await rootContainer.resolve<string>('appName');
  const logger = await createServerLogger(appName);
  const portString = process.env.PORT ?? process.env.HATCH_BUILDTIME_PORT;
  const port = (portString && parseInt(portString)) || 3000;
  const hostname = process.env.HOSTNAME || process.env.HATCH_BUILDTIME_HOSTNAME;
  if (process.env.NODE_ENV === 'development') {
    logger.info('Listening at http://' + (hostname ?? 'localhost') + ':' + port);
  }
  const errorReporter = new SentryReporter(sentryMonitor, logger, {dsn});
  rootContainer.registerInstance('ErrorReporter', errorReporter);
  logger.add(new ErrorReporterTransport({level: 'debug', format: format.label({label: appName})}, errorReporter));

  registerServerMiddleware(
    rootContainer,
    ...serverMiddlewareClasses,
  );

  const appVersion = rootContainer.isRegistered('appVersion')
      ? await rootContainer.resolve<string>('appVersion')
      : '0.0.0';

  const apiSpecBuilder = new OpenAPISpecBuilder(appName, appVersion);
  const serverMiddlewareList = await resolveServerMiddleware(rootContainer, logger);
  const apiMetadataConsumer = apiSpecBuilder.addAPIMetadata.bind(apiSpecBuilder);
  for (const serverMiddleware of serverMiddlewareList) {
    if (hasControllerRoutes(serverMiddleware.constructor)) {
      assignRootContainerToController(serverMiddleware, rootContainer);
    }
    await serverMiddleware.register(runningServerApp, runningServer, apiMetadataConsumer);
  }

  const apiSpec = apiSpecBuilder.build();
  runningServerApp.get('/api.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    const options: SerializeJSOptions = {unsafe: true, isJSON: true};
    if (req.query.pretty) {
      options.space = 2;
    }
    res.status(200).send(serialize(apiSpec, options));
  });

  serverExtension?.(runningServer, runningServerApp, composition, logger, errorReporter);

  if (newRunningServer) {
    runningServer
      .listen(port, hostname)
      .on('error', (err: Error) => {
        console.error(err);
      });
  } else {
    runningServer.on('request', runningServerApp);
  }
};

export default <T extends ServerComposition>(options: CreateServerOptions<T>,
                                             serverExtension?: ServerExtension<T>) => {
  initializeInjection(options.injectionOptions);
  const serverComposer = options.reloadComposeModule().default;
  createServerAsync(serverComposer, serverExtension).catch((err) => {
    console.error(err);
  });
};
