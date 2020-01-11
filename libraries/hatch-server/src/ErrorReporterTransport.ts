import {ErrorReporter} from '@launchtray/hatch-util';
import util from 'util';
import {LogCallback} from 'winston';
import TransportStream, {TransportStreamOptions} from 'winston-transport';

const formatObjectForLog = (obj: any) => {
  if (typeof obj === 'string') {
    return obj;
  }
  return util.inspect(obj, {breakLength: Infinity, compact: true});
};

export class ErrorReporterTransport extends TransportStream {
  constructor(opts: TransportStreamOptions, private readonly errorReporter: ErrorReporter) {
    super(opts);
  }

  public log(info: any, callback: LogCallback) {
    setImmediate(() => {
      this.emit('logged', info);
    });

    const {level, label, message} = info;
    const args = info[Symbol.for('splat')];
    let messageWithArgs = formatObjectForLog(message);
    if (args != null) {
      messageWithArgs += ' ' + args.map((obj: any) => {
        return formatObjectForLog(obj);
      }).join(' ');
    }
    const formattedMessage = `[${label}] [${level}]: ${messageWithArgs}`;
    this.errorReporter.captureLog(formattedMessage);

    callback();
  }

}