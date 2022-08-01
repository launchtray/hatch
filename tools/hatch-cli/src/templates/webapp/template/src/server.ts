import {createWebServer} from '@launchtray/hatch-web-server';

createWebServer({
  reloadComposeModule: () => {
    delete require.cache[require.resolve('./composeServer')];
    return require('./composeServer');
  },
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const module: any;

if (module.hot != null) {
  module.hot.accept();
}
