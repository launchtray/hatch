import sysPath from 'path';
import childProcess from 'child_process';
import webpack, {Compiler} from 'webpack';
import {Compilation} from 'mini-css-extract-plugin/types/utils';
import fs from 'fs';
import {PathLike} from 'node:fs';
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
  once: boolean; // Run once and exit when worker exits
  nodeArgs: string[]; // Node arguments for worker
  scriptArgs: string[]; // Script arguments for worker
  signal: boolean | string; // Send a signal instead of a message
  restartable: boolean; // Restartable via keyboard
  inject: boolean; // inject monitor to script
  killOnExit: boolean; // issue SIGKILL on child process exit
  killOnError: boolean; // issue SIGKILL on child process error
  killTimeout: number; // timeout before SIGKILL in milliseconds
  manifestPath?: string; // path to manifest file
}

const DEFAULT_OPTIONS: StartServerPluginOptions = {
  verbose: true,
  entryName: 'main',
  once: false,
  nodeArgs: [],
  scriptArgs: [],
  signal: false,
  // Only listen on keyboard in development, so the server doesn't hang forever
  restartable: process.env.NODE_ENV === 'development',
  inject: true,
  killOnExit: true,
  killOnError: true,
  killTimeout: 1000,
};

export default class StartServerPlugin {
  private readonly options: StartServerPluginOptions;
  private worker: childProcess.ChildProcess | null;
  private workerLoaded = false;
  private scriptFile: string | undefined;
  private exiting = false;

  constructor(options: Partial<StartServerPluginOptions> | string) {
    if (options == null) {
      options = {};
    }
    if (typeof options === 'string') {
      options = {entryName: options};
    }
    this.options = {
      ...DEFAULT_OPTIONS,
      ...options,
    };
    if (!Array.isArray(this.options.scriptArgs)) {
      throw new Error('options.args has to be an array of strings');
    }
    if (this.options.signal === true) {
      this.options.signal = 'SIGUSR2';
      this.options.inject = false;
    }
    this.afterEmit = this.afterEmit.bind(this);
    this.apply = this.apply.bind(this);
    this.handleChildError = this.handleChildError.bind(this);
    this.handleChildExit = this.handleChildExit.bind(this);
    this.handleChildQuit = this.handleChildQuit.bind(this);
    this.handleChildMessage = this.handleChildMessage.bind(this);
    this.handleWebpackExit = this.handleWebpackExit.bind(this);
    this.handleProcessKill = this.handleProcessKill.bind(this);
    this.exitCleanly = this.exitCleanly.bind(this);

    this.worker = null;
    if (this.options.restartable && !options.once) {
      this.enableRestarting();
    }
  }

  private info(msg: string, ...args: unknown[]) {
    if (this.options.verbose) console.log(`sswp> ${msg}`, ...args);
  }

  private error(msg: string, ...args: unknown[]) {
    console.error(`sswp> !!! ${msg}`, ...args);
  }

  private workerError(msg: string, ...args: unknown[]) {
    process.stderr.write(msg);
  }

  private workerInfo(msg: string, ...args: unknown[]) {
    process.stdout.write(msg);
  }

  private exitCleanly() {
    this.options.once = true;
    this.options.killOnExit = false;
    this.handleWebpackExit();
    process.exit(0);
  }

  private enableRestarting() {
    this.info('Type `rs<Enter>` to restart the worker');
    process.stdin.setEncoding('utf8');
    rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      prompt: '',
    });
    rl.on('line', (data) => {
      const cmd = data.toString().trim();
      if (cmd === 'rs') {
        if (this.worker != null && this.worker.pid != null) {
          this.info('Killing worker...');
          process.kill(this.worker.pid);
        } else {
          this.runWorker();
        }
      } else if (cmd === 'exit') {
        this.options.once = true;
        this.options.killOnExit = false;
        this.handleWebpackExit();
        process.exit(0);
      }
    });
  }

  private getScript(compilation: Compilation) {
    const {entryName} = this.options;
    const {entrypoints} = compilation;
    const entry = entrypoints.get
      ? entrypoints.get(entryName)
      : entrypoints[entryName];
    if (!entry) {
      this.info('compilation: %O', compilation);
      throw new Error(
        `Requested entry "${entryName}" does not exist, try one of: ${(entrypoints.keys
          ? Array.from(entrypoints.keys())
          : Object.keys(entrypoints)
        ).join(' ')}`,
      );
    }

    const runtimeChunk = webpack.EntryPlugin && (entry.runtimeChunk || entry._entrypointChunk);
    const runtimeChunkFiles = runtimeChunk && runtimeChunk.files && runtimeChunk.files.values();
    const entryScript = (runtimeChunkFiles && runtimeChunkFiles.next().value) || ((entry.chunks[0] || {}).files || [])[0];
    if (!entryScript) {
      this.error('Entry chunk not outputted: %O', entry);
      return;
    }
    const {path} = compilation.outputOptions;
    if (!path) {
      this.error('Path not outputted: %O', entry);
      return;
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
    this.error(`Script exited with ${signal ? `signal ${signal}` : `code ${code}`}`);
    this.worker = null;

    if (code === 143 || signal === 'SIGTERM') {
      if (!this.workerLoaded) {
        this.error('Script did not load, or HMR failed; not restarting');
        return;
      }
      if (this.options.once) {
        this.info('Only running script once, as requested');
        return;
      }

      this.workerLoaded = false;
      this.runWorker();
      return;
    }

    if (this.options.killOnExit) {
      this.handleProcessKill();
    }
  }

  private handleWebpackExit() {
    if (!this.exiting && this.worker != null && this.worker.pid != null) {
      this.exiting = true;
      process.kill(this.worker.pid, 'SIGINT');
    }
  }

  private handleChildError(ignored: Error) {
    this.error('Script errored');
    this.worker = null;

    if (this.options.killOnError) {
      this.handleProcessKill();
    }
  }

  private handleProcessKill() {
    const pKill = () => process.kill(process.pid, 'SIGKILL');

    if (!isNaN(this.options.killTimeout)) {
      setTimeout(pKill, this.options.killTimeout);
    } else {
      pKill();
    }
  }

  private handleChildMessage(message: string) {
    if (message === 'SSWP_LOADED') {
      this.workerLoaded = true;
      this.info('Script loaded');
      if (process.env.NODE_ENV === 'test' && this.options.once && this.worker != null && this.worker.pid != null) {
        process.kill(this.worker.pid);
      }
    } else if (message === 'SSWP_HMR_FAIL') {
      this.workerLoaded = false;
    }
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
      env: Object.assign(process.env, {FORCE_COLOR: 3}),
    });
    worker.on('exit', this.handleChildExit);
    worker.on('quit', this.handleChildQuit);
    worker.on('error', this.handleChildError);
    worker.on('message', this.handleChildMessage);
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

  private hmrWorker(compilation: Compilation, callback: () => void) {
    const {
      worker,
      options: {signal},
    } = this;
    if (signal != null && typeof signal !== 'boolean' && worker != null && worker.pid != null) {
      process.kill(worker.pid, signal);
    } else if (worker != null && worker.send) {
      worker.send('SSWP_HMR');
    } else {
      this.error('hot reloaded but no way to tell the worker');
    }
    callback();
  }

  async afterEmit(compilation: Compilation, callback: () => void) {
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
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }

    this.scriptFile = this.getScript(compilation);

    if (this.worker != null) {
      return this.hmrWorker(compilation, callback);
    }

    if (!this.scriptFile) return;

    this.runWorker(callback);
  }

  private getMonitor() {
    const loaderPath = require.resolve('./monitor-loader');
    return `!!${loaderPath}!${loaderPath}`;
  }

  apply(compiler: Compiler) {
    const {inject} = this.options;
    const plugin = {name: 'StartServerPlugin'};
    if (inject) {
      compiler.hooks.make.tap(plugin, (compilation: Compilation) => {
        compilation.addEntry(
          compilation.compiler.context,
          webpack.EntryPlugin.createDependency(this.getMonitor(), {
            name: this.options.entryName,
          }),
          this.options.entryName,
          () => {},
        );
      });
    }
    compiler.hooks.afterEmit.tapAsync(plugin, this.afterEmit);
  }
}
