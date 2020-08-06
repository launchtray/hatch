import express, {Application} from 'express';
import fs from 'fs';
import path from 'path';

export const loadStaticAssetsMetadata = () => {
  const assets = JSON.parse(fs.readFileSync(path.resolve(__dirname, './assets.json')) as any);
  let assetsPrefix: string;
  if (process.env.NODE_ENV === 'development') {
    assetsPrefix = '';
  } else {
    assetsPrefix = (process.env.STATIC_ASSETS_BASE_URL ?? '').replace(/\/$/, '');
  }
  if (assetsPrefix !== '') {
    __webpack_public_path__ = `${assetsPrefix}/`;
  }
  return {assets, assetsPrefix};
};

const addRedirect = (app: Application, path: string, assetsPrefix: string) => {
  app.get(path, (req, res) => {
    res.redirect(assetsPrefix + req.path);
  });
};

const addNotFound = (app: Application, path: string) => {
  app.get(path, (req, res) => {
    res.status(404).send();
  });
};

export const addStaticRoutes = (app: Application, assetsPrefix: string) => {
  app.disable('x-powered-by');
  if (assetsPrefix.length === 0 && process.env.NO_STATIC_HOSTING !== 'true') {
    const publicPath = process.env.NODE_ENV === 'development' ? '../public' : './public';
    const publicDir = path.resolve(__dirname, publicPath);
    app.use(express.static(publicDir));
  } else {
    if (assetsPrefix.length === 0) {
      // There is no URL prefix for static content, so it must be served at `/` otherwise, e.g. via a load balancer.
      addNotFound(app, '/favicon.ico');
      addNotFound(app, '/robots.txt');
    } else {
      addRedirect(app, '/favicon.ico', assetsPrefix);
      addRedirect(app, '/robots.txt', assetsPrefix);
    }
  }
  addNotFound(app, '/static/*');
};
