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

const REQUEST_LEVEL_TAG = 'http';
const REQUEST_LEVEL_COLOR_CODE = '36';
const RAW_LEVEL_MAX_LENGTH = 5;
const COLORIZED_LEVEL_MAX_LENGTH = RAW_LEVEL_MAX_LENGTH + 10; // 10 = overhead length of color escape sequence
const requestLogger = (serverLogFile: string) => {
  const useConsole = process.env.NODE_ENV === 'development' || process.env.LOG_TO_CONSOLE === 'true';
  return expressWinston.logger({
    transports: [useConsole ? new transports.Console() : new transports.File({filename: serverLogFile})],
    format: format.combine(
      format.timestamp(),
      {
        transform(info: any) {
          const {timestamp, message, meta} = info;
          const metaMessage = meta ? ' ' + formatObjectForLog(meta) : '';
          const useColor = useConsole && process.env.COLORIZE_LOG === 'true';
          const paddedLevel = useColor
            ? `[\x1b[${REQUEST_LEVEL_COLOR_CODE}m${REQUEST_LEVEL_TAG}\x1b[39m]`.padEnd(COLORIZED_LEVEL_MAX_LENGTH + 2)
            : `[${REQUEST_LEVEL_TAG}]`.padEnd(RAW_LEVEL_MAX_LENGTH + 2);
          info[Symbol.for('message')] = `[${timestamp}] ${paddedLevel}: ${message}${metaMessage}`;
          return info;
        },
      },
    ),
    meta: true,
    expressFormat: true,
  });
};

@injectable()
export default class RequestLogger implements ServerMiddleware {
  constructor(
    @inject('appName') private readonly appName: string,
    @inject('serverLogFile') private readonly serverLogFile: string,
  ) {}

  public async register(app: Application) {
    app.use(requestLogger(this.serverLogFile));
  }
}
