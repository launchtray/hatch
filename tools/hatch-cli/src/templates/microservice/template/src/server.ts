import {createMicroservice} from '@launchtray/hatch-server';

createMicroservice({
  reloadComposeModule: () => {
    delete require.cache[require.resolve('./composeServer')];
    return require('./composeServer');
  },
});

if (module.hot) {
  module.hot.accept();
}
