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
}
