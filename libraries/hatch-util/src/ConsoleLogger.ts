import {Logger} from './Logger';

export class ConsoleLogger implements Logger {
  public debug = console.debug.bind(console);
  public info = console.info.bind(console);
  public warn = console.warn.bind(console);
  public error = console.error.bind(console);
}
