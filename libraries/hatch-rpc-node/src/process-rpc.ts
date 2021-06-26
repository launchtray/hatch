import child_process, {Serializable} from 'child_process';
import {
  RpcTransport,
  RpcTransportClosedHandler,
  RpcTransportMessageHandler,
} from '@launchtray/hatch-rpc';

export class ChildProcessRpcTransport implements RpcTransport {
  public supportsBuffer = false;
  public readonly serviceName: string;

  constructor() {
    this.serviceName = process.env.CHILD_PROCESS_SERVICE_NAME as string;
  }

  public registerMessageHandler(handler: RpcTransportMessageHandler) {
    process.on('message', handler);
  }

  public sendMessage(message: unknown) {
    process.send?.(message);
  }

  public async close() {
    process.exit();
  }
}

export class MainProcessRpcTransport implements RpcTransport {
  public supportsBuffer = false;
  private childProcess;
  private messageHandler?: RpcTransportMessageHandler;
  private transportClosedHandler?: RpcTransportClosedHandler;

  constructor(public readonly serviceName: string, private readonly childProcessFilename = __filename) {
    this.childProcess = this.createChildProcess();
  }

  private createChildProcess() {
    const {childProcessFilename, serviceName} = this;
    return child_process.fork(childProcessFilename, [`--child-process=${serviceName}`], {
      env: {
        ...process.env,
        // eslint-disable-next-line @typescript-eslint/naming-convention -- follows ENV_VAR convention
        CHILD_PROCESS_SERVICE_NAME: serviceName,
      },
    });
  }

  private initializeChildProcess() {
    if (this.messageHandler != null) {
      this.childProcess.on('message', this.messageHandler);
    }
    this.childProcess.on('error', (error) => {
      this.handleWorkerError(error);
    });
    this.childProcess.on('exit', (code) => {
      if (code !== 0) {
        this.handleWorkerError(new Error(`Worker stopped with exit code ${code}`));
      } else {
        this.transportClosedHandler?.();
      }
    });
  }

  private handleWorkerError(error: Error) {
    this.childProcess.unref();
    this.childProcess = this.createChildProcess();
    this.transportClosedHandler?.(error);
    this.initializeChildProcess();
  }

  public registerMessageHandler(handler: RpcTransportMessageHandler) {
    this.messageHandler = handler;
    this.initializeChildProcess();
  }

  public registerTransportClosedHandler(handler: RpcTransportClosedHandler) {
    this.transportClosedHandler = handler;
  }

  public sendMessage(message: unknown) {
    this.childProcess.send(message as Serializable);
  }

  public async close() {
    this.childProcess.unref();
  }
}
