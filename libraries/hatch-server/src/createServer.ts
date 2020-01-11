import {
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
import util from 'util';
import {createLogger, format, transports} from 'winston';
import {ErrorReporterTransport} from './ErrorReporterTransport';
import {assignRootContainerToController, hasControllerRoutes} from './server-routing';
import {
  ServerComposer,
  ServerComposition,
} from './ServerComposer';
import {registerServerMiddleware, resolveServerMiddleware} from './ServerMiddleware';

export type ServerExtension<T extends ServerComposition> =
  (server: Application, composition: T, logger: Logger, errorReporter: ErrorReporter) => void;

export interface CreateServerOptions<T extends ServerComposition> {
  reloadComposeModule: () => {default: ServerComposer<T>};
  injectionOptions?: InjectionInitializationContext;
}

let runningServer: http.Server;
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

const createServerLogger = (errorReporter: ErrorReporter): Logger => {
  const rootContainer = ROOT_CONTAINER;
  const logger = createLogger({});
  const appName = rootContainer.resolve<string>('appName');
  const serverLogFile = rootContainer.resolve<string>('serverLogFile');
  const logLevel = rootContainer.resolve<string>('logLevel');
  if (process.env.NODE_ENV !== 'production') {
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
  logger.add(new ErrorReporterTransport({level: 'debug', format: format.label({label: appName})}, errorReporter));
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
    runningServer.removeListener('request', runningServerApp);
  }
  const composition: T = await serverComposer();

  runningServerApp = express();
  const serverMiddlewareClasses = composition.serverMiddleware ?? [];
  const rootContainer = ROOT_CONTAINER;

  const errorReporter = new SentryReporter(sentryMonitor, {dsn});
  rootContainer.registerInstance('ErrorReporter', errorReporter);

  const logger = createServerLogger(errorReporter);

  registerServerMiddleware(
    rootContainer,
    ...serverMiddlewareClasses,
  );

  const serverMiddlewareList = resolveServerMiddleware(rootContainer, logger);
  for (const serverMiddleware of serverMiddlewareList) {
    await serverMiddleware.register(runningServerApp);
    if (hasControllerRoutes(serverMiddleware.constructor)) {
      assignRootContainerToController(serverMiddleware, rootContainer);
    }
  }

  serverExtension?.(runningServerApp, composition, logger, errorReporter);

  if (runningServer == null) {
    runningServer = http.createServer(runningServerApp);
    runningServer
      .listen(process.env.PORT || 3000)
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
