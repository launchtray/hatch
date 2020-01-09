import {Logger} from './Logger';

export class NonLogger implements Logger {
    public debug() {}
    public info() {}
    public warn() {}
    public error() {}
}

export const NON_LOGGER = new NonLogger();
