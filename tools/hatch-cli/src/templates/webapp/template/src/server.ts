import {createWebServer} from '@launchtray/hatch-web-server';

createWebServer({
  reloadComposeModule: () => {
    delete require.cache[require.resolve('./composeServer')];
    return require('./composeServer');
  },
});

if (module.hot != null) {
  module.hot.accept();
}
