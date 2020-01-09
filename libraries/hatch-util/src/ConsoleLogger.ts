import {Logger} from './Logger';

export class ConsoleLogger implements Logger {
    public debug = console.debug.bind(console, this.createPrefix('debug'));
    public info = console.info.bind(console, this.createPrefix('info'));
    public warn = console.warn.bind(console, this.createPrefix('warn'));
    public error = console.error.bind(console, this.createPrefix('error'));

    // Note: evaluated at time of construction, not time of logging
    private createPrefix(level: string) {
        return `[${this.label}] [${level}]:`;
    }

    constructor(private readonly label: string) {
        this.label = label;
    }
}