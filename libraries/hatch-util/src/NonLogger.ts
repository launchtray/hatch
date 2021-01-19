import {Logger} from './Logger';

export class NonLogger implements Logger {
  /* eslint-disable @typescript-eslint/no-empty-function -- intentionally empty methods */
  public debug() {}
  public info() {}
  public warn() {}
  public error() {}
}

export const NON_LOGGER = new NonLogger();
