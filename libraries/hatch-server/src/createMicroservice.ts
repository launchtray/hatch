import createServer, {CreateServerOptions} from './createServer';
import {ServerComposition} from './ServerComposer';
import {
  addStaticRoutes,
  loadStaticAssetsMetadata,
} from './server-utils';
const {assets, assetsPrefix} = loadStaticAssetsMetadata();

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

export default (options: CreateServerOptions<ServerComposition>) => {
  createServer(options, (server, app) => {
    addStaticRoutes(app, assetsPrefix);
    app.get('/api', (req, res, next) => {
      renderClient().then((body) => {
        res.status(200).send(body);
      }).catch((err: Error) => {
        next?.(err);
      });
    });
  });
};
