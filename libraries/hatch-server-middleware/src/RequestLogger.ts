import {ServerMiddleware} from '@launchtray/hatch-server';
import {inject, injectable} from '@launchtray/hatch-util';
import {Application} from 'express';
import expressWinston from 'express-winston';
import util from 'util';
import {format, transports} from 'winston';

const formatObjectForLog = (obj: any) => {
  if (typeof obj === 'string') {
    return obj;
  }
  return util.inspect(obj, {breakLength: Infinity, compact: true});
};

const requestLogger = (tag: string, serverLogFile: string) => {
  return expressWinston.logger({
    transports: [
      process.env.NODE_ENV ===
      'development' ? new transports.Console() : new transports.File({filename: serverLogFile}),
    ],
    format: format.combine(
      format.label({label: tag}),
      format.timestamp(),
      {
        transform(info: any) {
          const {timestamp, level, label, message, meta} = info;
          const metaMessage = meta ? ' ' + formatObjectForLog(meta) : '';
          info[Symbol.for('message')] = `[${timestamp}] [${label}] [request] [${level}]: ${message}${metaMessage}`;
          return info;
        }
      },
    ),
    meta: true,
    expressFormat: true,
  });
};

@injectable()
export default class RequestLogger implements ServerMiddleware {
  constructor(@inject('appName') private readonly appName: string,
              @inject('serverLogFile') private readonly serverLogFile: string) {
    this.appName = appName;
    this.serverLogFile = serverLogFile;
  }

  public async register(app: Application) {
    app.use(requestLogger(this.appName, this.serverLogFile));
  }
}
