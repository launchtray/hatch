import {Readable, ReadableOptions} from 'stream';
import {CompletableFuture} from '@launchtray/hatch-util';
import * as UUID from 'uuid';
import EventEmitter from 'events';
import {JsonRpcBus, RpcBase, RpcNotificationHandler} from '@launchtray/hatch-rpc';

export class RpcReadableStream extends Readable {
  private readonly rpcBus: RpcBase;
  private readonly streamId: string;
  private readonly options?: unknown;
  private readonly streamType: string;
  private contextFuture: CompletableFuture<unknown>;

  constructor(
    {streamType, rpcBus, options}: {
      streamType: string,
      rpcBus: JsonRpcBus,
      options?: unknown,
    },
    readableOptions?: ReadableOptions,
  ) {
    super(readableOptions);
    this.contextFuture = new CompletableFuture<unknown>();
    this.streamType = streamType;
    this.rpcBus = rpcBus;
    this.options = options;
    this.streamId = UUID.v4().toString();

    rpcBus.addNotificationHandler(`${this.streamId}-context`, (params) => {
      const {context} = params as {context: unknown};
      this.contextFuture.complete(context);
    });
    rpcBus.addNotificationHandler(`${this.streamId}-data`, (params) => {
      const {data, isBase64Encoded} = params as {data: unknown, isBase64Encoded: boolean};
      let chunk: unknown;
      if (isBase64Encoded) {
        chunk = Buffer.from(data as string, 'base64');
      } else {
        chunk = data;
      }
      if (!this.push(chunk)) {
        this.destroy(new Error('RpcReadableStream does not support pausing streams'));
      }
    });
    rpcBus.addNotificationHandler(`${this.streamId}-end`, () => {
      this.cleanUp();
      this.push(null);
    });
    rpcBus.addNotificationHandler(`${this.streamId}-error`, (params) => {
      this.cleanUp();
      const {error} = params as {error: string};
      this.destroy(new Error(error));
    });
    rpcBus.notify(this.streamType, {
      id: this.streamId,
      options: this.options,
    });
  }

  public cleanUp() {
    this.rpcBus.removeAllNotificationHandlers(`${this.streamId}-context`);
    this.rpcBus.removeAllNotificationHandlers(`${this.streamId}-data`);
    this.rpcBus.removeAllNotificationHandlers(`${this.streamId}-end`);
    this.rpcBus.removeAllNotificationHandlers(`${this.streamId}-error`);
  }

  public async waitForContext(timeoutMs?: number) {
    return await this.contextFuture.get(timeoutMs);
  }

  // eslint-disable-next-line @typescript-eslint/naming-convention, @typescript-eslint/no-empty-function
  _read() {
    // Name and existence required by parent class
  }
}

export const registerRpcStreamRequestHandler = ({streamType, rpcBus, createReadableStream}: {
  streamType: string,
  rpcBus: RpcBase,
  createReadableStream: (
    options: unknown
  ) => Promise<{readStream: EventEmitter, context?: unknown}>,
}) => {
  unregisterRpcStreamRequestHandler({streamType, rpcBus});
  const handler: RpcNotificationHandler = async (params) => {
    const {id, options} = params as {
      id: string,
      options: unknown,
    };
    const {readStream, context} = await createReadableStream(options);
    const dataHandler = (data: unknown) => {
      let message: {data: unknown, isBase64Encoded: boolean};
      if (Buffer.isBuffer(data) && !rpcBus.supportsBuffer) {
        message = {data: data.toString('base64'), isBase64Encoded: true};
      } else {
        message = {data, isBase64Encoded: false};
      }
      rpcBus.notify(`${id}-data`, message);
    };
    readStream.on('data', dataHandler);
    readStream.once('end', () => {
      rpcBus.notify(`${id}-end`, {context});
      readStream.off('data', dataHandler);
    });
    readStream.once('error', (error) => {
      rpcBus.notify(`${id}-error`, {error: error.message});
      readStream.off('data', dataHandler);
    });
    rpcBus.notify(`${id}-context`, {context});
  };
  rpcBus.addNotificationHandler(streamType, handler);
  return {
    unregister: () => {
      unregisterRpcStreamRequestHandler({streamType, rpcBus});
    },
  };
};

export const unregisterRpcStreamRequestHandler = ({streamType, rpcBus}: {
  streamType: string,
  rpcBus: RpcBase,
}) => {
  // Only one stream handler per stream type can exist per bus
  rpcBus.removeAllNotificationHandlers(streamType);
};
