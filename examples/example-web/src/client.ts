import {createClient} from '@launchtray/hatch-web-client';

createClient({
  reloadComposeModule: () => {
    delete require.cache[require.resolve('./composeClient')];
    return require('./composeClient');
  },
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const module: any;

if (module.hot != null) {
  module.hot.accept();
}
