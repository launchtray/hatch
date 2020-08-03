import express, {Application} from 'express';
import fs from 'fs';
import path from 'path';

import createServer, {CreateServerOptions} from './createServer';
import {ServerComposition} from './ServerComposer';

let assets: any;
let assetsPrefix: string;

const syncLoadAssets = () => {
  assets = JSON.parse(fs.readFileSync(path.resolve(__dirname, './assets.json')) as any);
  if (process.env.NODE_ENV === 'development') {
    assetsPrefix = '';
  } else {
    assetsPrefix = (process.env.STATIC_ASSETS_BASE_URL ?? '').replace(/\/$/, '');
  }
  if (assetsPrefix !== '') {
    __webpack_public_path__ = `${assetsPrefix}/`;
  }
};
syncLoadAssets();

const renderClient = async (): Promise<string> => {
  const crossOrigin = process.env.NODE_ENV === 'development' || process.env.STATIC_ASSETS_CROSS_ORIGIN === 'true';
  const faviconPath = assetsPrefix + '/favicon.ico';
  return (`<!doctype html>
    <html lang="">
    <head>
      <script>
        window.__STATIC_ASSETS_BASE_URL__ = '${assetsPrefix}/';
      </script>
      <link rel="shortcut icon" href="${faviconPath}">
      <meta http-equiv="X-UA-Compatible" content="IE=edge" />
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1">
      ${assets.client.css ? `<link rel="stylesheet" href="${assetsPrefix + assets.client.css}">` : ''}
      ${crossOrigin
        ? `<script src="${assetsPrefix + assets.client.js}" defer crossorigin></script>`
        : `<script src="${assetsPrefix + assets.client.js}" defer></script>`
      }
    </head>
    <body>
      <div id="root"></div>
    </body>
    </html>`
  );
};

const addRedirect = (app: Application, path: string) => {
  app.get(path, (req, res) => {
    res.redirect(assetsPrefix + req.path);
  });
};

export default (options: CreateServerOptions<ServerComposition>) => {
  createServer(options, (server, app) => {
    app.disable('x-powered-by');
    if (assetsPrefix.length === 0) {
      const publicPath = process.env.NODE_ENV === 'development' ? '../public' : '../build/public';
      const publicDir = path.resolve(__dirname, publicPath);
      app.use(express.static(publicDir));
    } else {
      addRedirect(app, '/favicon.ico');
      addRedirect(app, '/robots.txt');
      addRedirect(app, '/static/*');
    }
    app.get('/api', (req, res, next) => {
      renderClient().then((body) => {
        res.status(200).send(body);
      }).catch((err: Error) => {
        next?.(err);
      });
    });
  });
};
