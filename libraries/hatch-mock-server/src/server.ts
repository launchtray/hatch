// @ts-ignore -- type definitions not provided, and api is simple
import mockserver from 'mockserver-node';
import {mockServerClient} from 'mockserver-client';
import tmp from 'tmp';

export const DEFAULT_PORT = 1080;

export default class MockServer {
  public readonly port;
  private tmpDir?: tmp.DirResult;

  constructor(
    port: number,
    private options?: {[key: string]: any}
  ) {
    this.port = port ?? this.options?.serverPort ?? DEFAULT_PORT;
  }

  async start() {
    this.tmpDir = tmp.dirSync({unsafeCleanup: true});
    const cwd = process.cwd();

    try {
      // Avoid polluting cwd
      process.chdir(this.tmpDir.name);
      await mockserver.start_mockserver({
        ...this.options,
        serverPort: this.port,
        debug: true,
      });
      await mockServerClient('localhost', this.port).mockAnyResponse({
        httpRequest: {
          path: this.options?.statusCheckPath ?? '/mock-server-status',
        },
        httpResponse: {
          statusCode: 200,
          body: 'Mock server is running!',
        },
      });
    } finally {
      process.chdir(cwd);
    }
    return {workingDir: this.tmpDir.name};
  }

  async stop() {
    await mockserver.stop_mockserver({serverPort: this.port});
    this.tmpDir?.removeCallback();
  }
}
