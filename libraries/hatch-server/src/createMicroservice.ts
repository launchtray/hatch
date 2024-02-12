import crypto from 'crypto';

import createServer, {CreateServerOptions} from './createServer';
import {ServerComposition} from './ServerComposer';
import {
  addStaticRoutes,
  loadStaticAssetsMetadata,
} from './server-utils';

const {assets, assetsPrefix} = loadStaticAssetsMetadata();

const renderClient = async (): Promise<string> => {
  const crossOrigin = process.env.NODE_ENV === 'development' || process.env.STATIC_ASSETS_CROSS_ORIGIN === 'true';
  const faviconPath = `${assetsPrefix}/favicon.ico`;
  let assetsScript: string;
  if (assets['client.js'] != null) {
    assetsScript = crossOrigin
      ? `<script src="${assetsPrefix + assets['client.js']}" defer crossorigin></script>`
      : `<script src="${assetsPrefix + assets['client.js']}" defer></script>`;
  } else {
    assetsScript = '';
  }

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
      ${assets?.['client.css'] != null ? `<link rel="stylesheet" href="${assetsPrefix + assets['client.css']}">` : ''}
      ${assetsScript}
    </head>
    <body>
      <div id="root"></div>
    </body>
    </html>`
  );
};

export default (options: CreateServerOptions<ServerComposition>) => {
  createServer(options, (server, app) => {
    if (process.env.ENABLE_API_SPEC === 'true' || process.env.NODE_ENV === 'development') {
      addStaticRoutes(app, assetsPrefix);
      app.get('/api', (req, res, next) => {
        crypto.randomBytes(32, (err, buf) => {
          if (err != null) {
            next(err);
            return;
          }
          renderClient().then((body) => {
            res.cookie('double_submit', buf.toString('hex'));
            res.status(200).send(body);
          }).catch((renderErr: Error) => {
            next?.(renderErr);
          });
        });
      });
    }
  });
};
