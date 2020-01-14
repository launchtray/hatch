import {createClient} from '@launchtray/hatch-web-client';

createClient({
  reloadComposeModule: () => {
    delete require.cache[require.resolve('./composeClient')];
    return require('./composeClient');
  },
});

if (module.hot) {
  module.hot.accept();
}
