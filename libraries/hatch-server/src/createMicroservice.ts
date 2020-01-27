import express from 'express';

import createServer, {CreateServerOptions} from './createServer';
import {ServerComposition} from './ServerComposer';

let assets: any;

const syncLoadAssets = () => {
  assets = require(process.env.RAZZLE_ASSETS_MANIFEST!);
};
syncLoadAssets();

const renderClient = async (): Promise<string> => {
  return (`<!doctype html>
    <html lang="">
    <head
      <meta http-equiv="X-UA-Compatible" content="IE=edge" />
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1">
      ${assets.client.css ? `<link rel="stylesheet" href="${assets.client.css}">` : ''}
      ${
      process.env.NODE_ENV === 'production'
        ? `<script src="${assets.client.js}" defer></script>`
        : `<script src="${assets.client.js}" defer crossorigin></script>`
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
    app
      .disable('x-powered-by')
      .use(express.static(process.env.RAZZLE_PUBLIC_DIR!))
      .get('/api', (req, res, next) => {
        renderClient().then((body) => {
          res.status(200).send(body);
        }).catch((err: Error) => {
          next?.(err);
        });
      });
  });
};
