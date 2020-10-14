import {BasicRouteParams} from '@launchtray/hatch-server-middleware';
import {CompletableFuture, containerSingleton} from '@launchtray/hatch-util';
import ReactPDF from '@launchtray/react-pdf-renderer';
import React from 'react';

@containerSingleton()
export default class PDFResponder {
  constructor(
    public readonly params: BasicRouteParams
  ) {}

  async sendDocument(document: React.ReactElement<ReactPDF.DocumentProps>) {
    const completedFuture = new CompletableFuture();
    this.params.res.contentType('application/pdf');
    const testIdOutputData = {};
    const readStream = await ReactPDF.renderToStream(document, {testIdOutputData});
    if (this.params.req.header('x-pdf-test-metadata')) {
      this.params.res.header('x-pdf-test-metadata', JSON.stringify(testIdOutputData));
    }
    readStream.pipe(this.params.res);
    readStream.on('end', () => {
      completedFuture.complete();
    });
    await completedFuture.get();
  }
}
