import {
  initializeInjection,
  InjectionInitializationContext,
  ROOT_CONTAINER,
} from '@launchtray/hatch-util';
import express, {Application} from 'express';
import http from 'http';
import {assignRootContainerToController, hasControllerRoutes} from './server-routing';
import {
  ServerComposer,
  ServerComposition,
} from './ServerComposer';
import {registerServerMiddleware, resolveServerMiddleware} from './ServerMiddleware';

export type ServerExtension<T extends ServerComposition> = (server: Application, composition: T) => void;

export interface CreateServerOptions<T extends ServerComposition> {
  reloadComposeModule: () => {default: ServerComposer<T>};
  injectionOptions?: InjectionInitializationContext;
}

let runningServer: http.Server;
let runningServerApp: Application;

if (module.hot) {
  module.hot.dispose((data) => {
    data.runningServerApp = runningServerApp;
    data.runningServer = runningServer;
  });
  if (module.hot.data) {
    runningServerApp = module.hot.data.runningServerApp;
    runningServer = module.hot.data.runningServer;
  }
}

const createServerAsync = async <T extends ServerComposition>(
  serverComposer: ServerComposer<T>,
  serverExtension?: ServerExtension<T>,
) => {
  if (runningServer != null && runningServerApp != null) {
    runningServer.removeListener('request', runningServerApp as any);
  }
  const composition: T = await serverComposer();
  const {logger} = composition;
  runningServerApp = express();
  const serverMiddlewareClasses = composition.serverMiddleware ?? [];
  const rootContainer = ROOT_CONTAINER;

  registerServerMiddleware(
    rootContainer,
    ...serverMiddlewareClasses,
  );

  const serverMiddlewareList = resolveServerMiddleware(rootContainer, logger);
  for (const serverMiddleware of serverMiddlewareList) {
    await serverMiddleware.register(runningServerApp);
    if (hasControllerRoutes(serverMiddleware.constructor)) {
      assignRootContainerToController(serverMiddleware, rootContainer);
    }
  }

  serverExtension?.(runningServerApp, composition);

  if (runningServer == null) {
    runningServer = http.createServer(runningServerApp);
    runningServer
      .listen(process.env.PORT || 3000)
      .on('error', (err: Error) => {
        console.error(err);
      });
  } else {
    runningServer.on('request', runningServerApp as any);
  }
};

export default <T extends ServerComposition>(options: CreateServerOptions<T>, serverExtension?: ServerExtension<T>) => {
  initializeInjection(options.injectionOptions);
  const serverComposer = options.reloadComposeModule().default;
  createServerAsync(serverComposer, serverExtension).catch((err) => {
    console.error(err);
  });
};
