import sysPath from 'path';
import childProcess from 'child_process';
import webpack, {Compiler, Compilation} from 'webpack';
import fs from 'fs';
import {PathLike} from 'node:fs';
import util from 'util';
import readline from 'readline';

let rl: readline.Interface | undefined;

const exists = async (f: PathLike) => {
  try {
    await fs.promises.stat(f);
    return true;
  } catch {
    return false;
  }
};

export interface StartServerPluginOptions {
  verbose: boolean; // print logs
  entryName: string; // What to run
  nodeArgs: string[]; // Node arguments for worker
  scriptArgs: string[]; // Script arguments for worker
  manifestPath?: string; // path to manifest file
}

const DEFAULT_OPTIONS: StartServerPluginOptions = {
  verbose: true,
  entryName: 'main',
  nodeArgs: [],
  scriptArgs: [],
};

const HMR_SIGNAL = 'SIGUSR2';

export default class StartServerPlugin {
  private readonly options: StartServerPluginOptions;
  private worker: childProcess.ChildProcess | null;
  private workerLoaded = false;
  private scriptFile: string | undefined;
  private exiting = false;
  private preventRestart = false;

  constructor(options: Partial<StartServerPluginOptions> | string) {
    let localOptions: Partial<StartServerPluginOptions>;
    if (options == null) {
      localOptions = {};
    } else if (typeof options === 'string') {
      localOptions = {entryName: options};
    } else {
      localOptions = {...options};
    }
    this.options = {
      ...DEFAULT_OPTIONS,
      ...localOptions,
    };
    if (!Array.isArray(this.options.scriptArgs)) {
      throw new Error('options.args has to be an array of strings');
    }

    this.afterEmit = this.afterEmit.bind(this);
    this.apply = this.apply.bind(this);
    this.handleChildError = this.handleChildError.bind(this);
    this.handleChildExit = this.handleChildExit.bind(this);
    this.handleChildQuit = this.handleChildQuit.bind(this);
    this.handleWebpackExit = this.handleWebpackExit.bind(this);
    this.exitCleanly = this.exitCleanly.bind(this);

    this.worker = null;
    rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      prompt: '',
    });
  }

  private info(msg: string, ...args: unknown[]) {
    // eslint-disable-next-line no-console
    if (this.options.verbose) console.log(`sswp> ${msg}`, ...args);
  }

  private error(msg: string, ...args: unknown[]) {
    // eslint-disable-next-line no-console
    console.error(`sswp> !!! ${msg}`, ...args);
  }

  private workerError(msg: string) {
    process.stderr.write(msg);
  }

  private workerInfo(msg: string) {
    process.stdout.write(msg);
  }

  private exitCleanly() {
    this.preventRestart = true;
    this.handleWebpackExit();
    // noinspection TypeScriptValidateJSTypes
    process.exit(0);
  }

  private getScript(compilation: Compilation) {
    const {entryName} = this.options;
    const {entrypoints} = compilation;
    const entry = (entrypoints as (Map<string, unknown> | Record<string, unknown>)).get != null
      ? entrypoints.get(entryName)
      : entrypoints[entryName];
    if (entry == null) {
      this.info('compilation: %O', compilation);
      throw new Error(`Requested entry "${entryName}" does not exist`);
    }

    // eslint-disable-next-line no-underscore-dangle
    const runtimeChunk = webpack.EntryPlugin != null && (entry.runtimeChunk ?? entry._entrypointChunk);
    const runtimeChunkFiles = runtimeChunk?.files?.values();
    const entryScript = (runtimeChunkFiles?.next().value) ?? ((entry.chunks[0] ?? {}).files ?? [])[0];
    if (entryScript == null) {
      this.error('Entry chunk not outputted: %O', entry);
      return undefined;
    }
    const {path} = compilation.outputOptions;
    if (path == null) {
      this.error('Path not outputted: %O', entry);
      return undefined;
    }
    return sysPath.resolve(path, entryScript);
  }

  private getExecArgv() {
    return (this.options.nodeArgs ?? []).concat(process.execArgv);
  }

  private handleChildQuit() {
    this.worker = null;
  }

  private handleChildExit(code: number, signal: string) {
    this.error(`Script exited with ${signal != null ? `signal ${signal}` : `code ${code}`}`);
    this.worker = null;

    if (code === 143 || signal === 'SIGTERM') {
      if (!this.workerLoaded) {
        this.error('Script did not load, or HMR failed; not restarting');
        return;
      }
      if (this.preventRestart) {
        this.info('Only running script once, as requested');
        return;
      }

      this.workerLoaded = false;
      this.runWorker();
    }
  }

  private handleWebpackExit() {
    if (!this.exiting && this.worker != null && this.worker.pid != null) {
      this.exiting = true;
      process.kill(this.worker.pid, 'SIGINT');
    }
  }

  private handleChildError() {
    this.error('Script errored');
    this.worker = null;
  }

  private runWorker(callback?: () => void) {
    if (this.worker != null) return;
    const {
      scriptFile,
      options: {scriptArgs},
    } = this;

    if (scriptFile == null) {
      this.error('Script file not found');
      return;
    }

    const execArgv = this.getExecArgv();
    const extScriptArgs = ['--color', '--ansi', ...scriptArgs];

    if (this.options.verbose) {
      const cmdline = [...execArgv, scriptFile, '--', ...extScriptArgs].join(' ');
      this.info(`running \`node ${cmdline}\``);
    }

    const worker = childProcess.fork(scriptFile, extScriptArgs, {
      execArgv,
      silent: true,
      // eslint-disable-next-line @typescript-eslint/naming-convention
      env: Object.assign(process.env, {FORCE_COLOR: 3}),
    });
    worker.on('exit', this.handleChildExit);
    worker.on('quit', this.handleChildQuit);
    worker.on('error', this.handleChildError);
    if (worker.stdout != null) {
      worker.stdout.on('data', this.workerInfo);
    }
    if (worker.stderr != null) {
      worker.stderr.on('data', this.workerError);
    }

    process.on('exit', this.handleWebpackExit);
    process.on('uncaughtException', this.handleWebpackExit);
    process.on('SIGINT', this.exitCleanly);
    process.on('SIGTERM', this.exitCleanly);
    process.on('SIGQUIT', this.exitCleanly);
    rl?.on('SIGINT', this.exitCleanly);
    rl?.on('SIGTERM', this.exitCleanly);
    rl?.on('SIGQUIT', this.exitCleanly);

    this.worker = worker;

    if (callback != null) callback();
  }

  private hmrWorker(ignored: Compilation, callback: () => void) {
    const {worker} = this;
    if (worker != null && worker.pid != null) {
      this.info(`Sending ${HMR_SIGNAL} to worker`);
      process.kill(worker.pid, HMR_SIGNAL);
    } else {
      this.error('hot reloaded but no way to tell the worker');
    }
    callback();
  }

  async afterEmit(compilation: Compilation, callback: () => void) {
    this.info(`afterEmit: ${util.inspect({assets: compilation.assets})}`);
    // monitor filesystem to wait for manifest.json to exist
    const {options: {manifestPath}} = this;
    if (manifestPath != null) {
      const {path} = compilation.outputOptions;
      if (path == null) {
        this.error('Path not known');
        return;
      }
      this.info('Waiting for manifest to exist...');
      while (!(await exists(manifestPath))) {
        await new Promise((resolve) => {
          setTimeout(resolve, 100);
        });
      }
    }

    this.scriptFile = this.getScript(compilation);

    if (this.worker != null) {
      this.hmrWorker(compilation, callback);
      return;
    }

    if (this.scriptFile == null) {
      return;
    }

    this.runWorker(callback);
  }

  apply(compiler: Compiler) {
    const plugin = {name: 'StartServerPlugin'};
    compiler.hooks.afterEmit.tapAsync(plugin, this.afterEmit);
  }
}
