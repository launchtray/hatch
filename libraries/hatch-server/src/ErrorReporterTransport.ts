import {ErrorReporter} from '@launchtray/hatch-util';
import util from 'util';
import {LogCallback} from 'winston';
import TransportStream, {TransportStreamOptions} from 'winston-transport';

const formatObjectForLog = (obj: unknown) => {
  if (typeof obj === 'string') {
    return obj;
  }
  return util.inspect(obj, {breakLength: Infinity, compact: true});
};

const RAW_LEVEL_MAX_LENGTH = 5;
export class ErrorReporterTransport extends TransportStream {
  constructor(opts: TransportStreamOptions, private readonly errorReporter: ErrorReporter) {
    super(opts);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- signature is defined by winston
  public log(info: any, callback: LogCallback) {
    setImmediate(() => {
      this.emit('logged', info);
    });

    const {level, message} = info;
    const args = info[Symbol.for('splat')];
    let messageWithArgs = formatObjectForLog(message);
    if (args != null) {
      messageWithArgs += ` ${args.map((obj: unknown) => {
        return formatObjectForLog(obj);
      }).join(' ')}`;
    }
    // Remove ANSI color codes, per https://stackoverflow.com/questions/25245716
    messageWithArgs = messageWithArgs.replace(
      // eslint-disable-next-line no-control-regex
      /[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g,
      '',
    );
    const paddedLevel = `[${level}]`.padEnd(RAW_LEVEL_MAX_LENGTH + 2);
    this.errorReporter.captureLog(`${paddedLevel}: ${messageWithArgs}`);
    callback();
  }
}
