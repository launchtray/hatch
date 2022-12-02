import {Readable} from 'stream';
import CompletableFuture from './CompletableFuture';

export default class StreamUtils {
  static convertWebStreamToNodeReadable<T>(readableStream: ReadableStream<T>): Readable {
    // https://stackoverflow.com/questions/73308289
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    return Readable.fromWeb(readableStream);
  }

  static convertNodeReadableToWebStream(readable: Readable): ReadableStream {
    return Readable.toWeb(readable);
  }

  static async convertNodeReadableToBuffer(readable: Readable): Promise<Buffer> {
    const bufferFuture = new CompletableFuture<Buffer>();
    const bufs: Buffer[] = [];
    readable.on('data', (d) => {
      bufs.push(d);
    });
    readable.on('end', () => {
      bufferFuture.complete(Buffer.concat(bufs));
    });
    return await bufferFuture.get();
  }

  static convertBufferToNodeReadable(buffer: Buffer) {
    return Readable.from(buffer);
  }

  static createAsyncReadable(dataSource?: {
    registerCancellation?: (
      cancelStreaming: () => void,
    ) => void,
    startStreaming?: (
      streamChunk: (chunk: unknown, encoding?: BufferEncoding) => Promise<boolean>,
    ) => Promise<void>,
    onComplete?: () => void,
  }): Readable {
    const responseStream = new Readable();
    let readCalledFuture = new CompletableFuture();
    // eslint-disable-next-line no-underscore-dangle
    responseStream._read = () => {
      readCalledFuture.complete();
    };

    let connectionClosed = false;
    dataSource?.registerCancellation?.(() => {
      if (!connectionClosed) {
        connectionClosed = true;
      }
    });

    if (dataSource?.startStreaming != null) {
      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      dataSource.startStreaming(
        async (chunk, encoding) => {
          if (!connectionClosed) {
            await readCalledFuture.get();
            responseStream.push(chunk, encoding);
            readCalledFuture = new CompletableFuture();
            return true;
          }
          return false;
        },
      ).finally(() => {
        if (!connectionClosed) {
          // eslint-disable-next-line @typescript-eslint/no-floating-promises
          readCalledFuture.get()
            .then(() => {
              if (!connectionClosed) {
                responseStream.push(null);
                connectionClosed = true;
              }
            })
            .finally(() => {
              dataSource.onComplete?.();
            });
        } else {
          dataSource.onComplete?.();
        }
      });
    } else {
      responseStream.push(null);
      dataSource?.onComplete?.();
    }
    return responseStream;
  }
}
