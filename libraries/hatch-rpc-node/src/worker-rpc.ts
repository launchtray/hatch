import {parentPort, Worker, workerData} from 'worker_threads';
import {
  RpcTransport,
  RpcTransportClosedHandler,
  RpcTransportMessageHandler,
} from '@launchtray/hatch-rpc';

export class WorkerThreadRpcTransport implements RpcTransport {
  public readonly supportsBuffer = true;
  public readonly serviceName: string;

  constructor() {
    this.serviceName = workerData.serviceName;
  }

  public registerMessageHandler(handler: RpcTransportMessageHandler) {
    parentPort?.on('message', handler);
  }

  public sendMessage(message: unknown) {
    parentPort?.postMessage(message);
  }

  public async close() {
    process.exit();
  }
}

export class MainThreadRpcTransport implements RpcTransport {
  public readonly supportsBuffer = true;
  private workerThread: Worker;
  private messageHandler?: RpcTransportMessageHandler;
  private transportClosedHandler?: RpcTransportClosedHandler;

  constructor(public readonly serviceName: string, private readonly workerFilename = __filename) {
    this.workerThread = new Worker(workerFilename, {workerData: {serviceName: this.serviceName}});
  }

  private initializeWorker() {
    if (this.messageHandler != null) {
      this.workerThread.on('message', this.messageHandler);
    }
    this.workerThread.on('error', (error) => {
      this.handleWorkerError(error);
    });
    this.workerThread.on('exit', (code) => {
      if (code !== 0) {
        this.handleWorkerError(new Error(`Worker stopped with exit code ${code}`));
      } else {
        this.transportClosedHandler?.();
      }
    });
  }

  private handleWorkerError(error: Error) {
    this.workerThread.unref();
    this.workerThread = new Worker(this.workerFilename, {workerData: {serviceName: this.serviceName}});
    this.transportClosedHandler?.(error);
    this.initializeWorker();
  }

  public registerMessageHandler(handler: RpcTransportMessageHandler) {
    this.messageHandler = handler;
    this.initializeWorker();
  }

  public registerTransportClosedHandler(handler: RpcTransportClosedHandler) {
    this.transportClosedHandler = handler;
  }

  public sendMessage(message: unknown) {
    this.workerThread.postMessage(message);
  }

  public async close() {
    this.workerThread.unref();
  }

  public getWorker(): Worker {
    return this.workerThread;
  }
}
