import {DEFAULT_PORT, MockServer} from './index';

const mockServer = new MockServer(parseInt(process.env.PORT ?? `${DEFAULT_PORT}`, 10));
let stopped = false;

process.on('beforeExit', async () => {
  if (!stopped) {
    stopped = true;
    await mockServer.stop();
  }
});

mockServer.start()
  .catch((err) => {
    // eslint-disable-next-line no-console -- intentional printing of unexpected issues to console
    console.error(err);
    process.exit(1);
  });
