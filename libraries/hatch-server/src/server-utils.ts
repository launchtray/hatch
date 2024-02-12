import express, {Application} from 'express';
import fs from 'fs';
import path from 'path';

// This works around a bug where manifest.json is incomplete after a client compilation failure
let warningShown = false;
const getAssets = () => {
  const assets = JSON.parse(fs.readFileSync(path.resolve(__dirname, './manifest.json')) as unknown as string);
  if (process.env.NODE_ENV === 'development') {
    const portString = process.env.PORT ?? process.env.HATCH_BUILDTIME_PORT;
    let port: number;
    if (portString != null) {
      port = parseInt(portString, 10);
    } else {
      port = 3000;
    }
    const hardcodedFix = {
      'client.js': `http://localhost:${port + 1}/static/js/client.js`,
      'client.js.map': `http://localhost:${port + 1}/static/js/client.js.map`,
    };
    if (assets?.['client.js'] == null && !warningShown) {
      warningShown = true;
      // eslint-disable-next-line no-console
      console.error(`
      !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
      !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
      !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
      !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
      !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
      !! Encountered bug that prevents assets manifest from containing client.js information.        !!
      !! Hatch will attempt to work around this, but you may need to restart your development server !!
      !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
      !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
      !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
      !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
      !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
      
      `);
    }
    return {
      ...hardcodedFix,
      ...assets,
    };
  }
  return assets;
};

export const loadStaticAssetsMetadata = () => {
  let assetsPrefix: string;
  if (process.env.NODE_ENV === 'development') {
    assetsPrefix = '';
  } else {
    assetsPrefix = (process.env.STATIC_ASSETS_BASE_URL ?? '').replace(/\/$/, '');
  }
  if (assetsPrefix !== '') {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    // eslint-disable-next-line no-undef -- global
    __webpack_public_path__ = `${assetsPrefix}/`;
  }
  const assets = getAssets();
  return {assets, assetsPrefix};
};

const addRedirect = (app: Application, originalPath: string, assetsPrefix: string) => {
  app.get(originalPath, (req, res) => {
    res.redirect(assetsPrefix + req.path);
  });
};

const addNotFound = (app: Application, originalPath: string) => {
  app.get(originalPath, (req, res) => {
    res.status(404).send();
  });
};

export const addStaticRoutes = (app: Application, assetsPrefix: string) => {
  app.disable('x-powered-by');
  if (assetsPrefix.length === 0 && process.env.NO_STATIC_HOSTING !== 'true') {
    const publicPath = process.env.NODE_ENV === 'development' ? '../public' : './public';
    const publicDir = path.resolve(__dirname, publicPath);
    app.use(express.static(publicDir));
  } else if (assetsPrefix.length === 0) {
    // There is no URL prefix for static content, so it must be served at `/` otherwise, e.g. via a load balancer.
    addNotFound(app, '/favicon.ico');
    addNotFound(app, '/robots.txt');
  } else {
    addRedirect(app, '/favicon.ico', assetsPrefix);
    addRedirect(app, '/robots.txt', assetsPrefix);
  }
  addNotFound(app, '/static/*');
};
