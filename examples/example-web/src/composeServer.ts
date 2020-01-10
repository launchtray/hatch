import {middlewareFor} from '@launchtray/hatch-server';
import {
  JSONBodyParser,
  RequestLogger,
  RouteNotFound,
} from '@launchtray/hatch-server-middleware';
import {ROOT_CONTAINER} from '@launchtray/hatch-util';
import {WebServerComposition} from '@launchtray/hatch-web-server';
import util from 'util';
import {createLogger, format, transports} from 'winston';
import composeCommon from './composeCommon';
import ExampleController from './controllers/ExampleController';

const appName = process.env.APP_NAME || 'hatch-server';

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

export default async (): Promise<WebServerComposition> => {
  ROOT_CONTAINER.register('appName', {useValue: appName});
  ROOT_CONTAINER.register('serverLogFile', {useValue: 'server.log'});
  const logger = createLogger({});
  if (process.env.NODE_ENV !== 'production') {
    logger.add(new transports.Console({
      level: 'debug',
      format: format.combine(
        format.colorize(),
        customLogFormat(appName),
      ),
    }));
  } else {
    logger.add(new transports.File({
      filename: 'server.log',
      level: 'debug',
      format: customLogFormat(appName),
      maxsize: 10 ** 8,
      maxFiles: 5,
      zippedArchive: true,
      tailable: true
    }));
  }
  logger.debug('composeServer');

  ROOT_CONTAINER.registerInstance('Logger', logger);

  const commonComposition = await composeCommon();

  return {
    ...commonComposition,
    serverMiddleware: [
      JSONBodyParser,
      RequestLogger,
      middlewareFor(ExampleController),
      RouteNotFound, // Catch-all 404 for unimplemented APIs
    ],
  };
};
