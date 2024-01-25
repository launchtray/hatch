// Monitor server script startup and reload. Should be added at the end of entries
const monitorFn = () => {
  // Handle hot updates, copied with slight adjustments from webpack/hot/signal.js
  if (module.hot) {
    const checkForUpdate = () => {
      if (module.hot == null) {
        return;
      }
      module.hot?.check()
        .then(function (updatedModules) {
          if (!updatedModules) {
            return;
          }
          if (module.hot == null) {
            return;
          }

          return module.hot
            .apply({
              ignoreUnaccepted: true,
            })
            .then(function (renewedModules) {
              require('webpack/hot/log-apply-result')(
                updatedModules,
                renewedModules
              );

              checkForUpdate();
            });
        })
        .catch(function () {
          if (module.hot == null) {
            return;
          }
          const status = module.hot.status();
          if (['abort', 'fail'].indexOf(status) >= 0) {
            if (process.send) {
              process.send('SSWP_HMR_FAIL');
            }
            process.exit(222);
          }
        });
    };

    process.on('message', function (message) {
      if (message !== 'SSWP_HMR') return;
      if (module.hot == null) {
        return;
      }
      if (module.hot.status() !== 'idle') {
        return;
      }
      checkForUpdate();
    });
  }

  // Tell our plugin we loaded all the code without initially crashing
  if (process.send) {
    process.send('SSWP_LOADED');
  }
};

export default monitorFn;