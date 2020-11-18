import {PDFImage} from 'pdf-image';
import stream from 'stream';
import fs from 'fs';
import fetch from 'node-fetch';
import tmp from 'tmp';
import util from 'util';
import sharp, {Sharp} from 'sharp';
import pixelmatch from 'pixelmatch';
import {execSync} from 'child_process';
import {PNG, PNGWithMetadata} from 'pngjs';

const pipeline = util.promisify(stream.pipeline);

interface ImageFrame {
  left: number;
  top: number;
  width: number;
  height: number;
}

interface ImageInset {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

interface FrameComparisonOptions {
  frame?: ImageFrame;
  page?: number;
  expectedAssetPath: string;

  // Use only if partial pixels included in the image due to rounding cause irrelevant differences
  roundFrameInward?: boolean;
}

interface TestIDComparisonOptions {
  testID: string;
  expectedAssetPath: string;

  // Use only if partial pixels included in the image due to rounding cause irrelevant differences
  roundFrameInward?: boolean;
}

export const PDF_POINTS_PER_INCH = 72;
export const PNG_PIXELS_PER_INCH = 360; // Over typical print quality, and multiple of points/inch

export const toPixel = (point: number) => {
  return (point * PNG_PIXELS_PER_INCH) / PDF_POINTS_PER_INCH;
};

const writeBufferToTempFile = async (buffer: Buffer, description: string = ''): Promise<string> => {
  const path = tmp.fileSync({postfix: description + '.png'}).name;
  fs.writeFileSync(path, buffer);
  return path;
};

const writeImageToTempFile = async (image: Sharp, description: string = ''): Promise<string> => {
  return writeBufferToTempFile(await image.toBuffer(), description);
};

const defaultRequiredImageMagickVersion = '7.0.10-35';

export class PDF {
  private pageImages: {[key: number]: Promise<string>} = {};
  private tmpPdfFile = tmp.fileSync({postfix: '.pdf'});
  private pdfImage?: PDFImage;
  private pdfTestMetadata?: {
    [testID: string]: {
      pageNumber: number,
      layout: ImageFrame,
      padding: ImageInset,
      margin: ImageInset,
    },
  };

  constructor(
    private pdfUrl: string,
    private fetchOptions: {
      headers?: {[key: string]: string},
      method?: string,
      body?: any,
    },
    private imageMagickVersion: string = defaultRequiredImageMagickVersion,
  ) {
    const versionInfo = execSync('convert --version', {encoding: 'utf8'});
    if (!versionInfo.includes(`Version: ImageMagick ${imageMagickVersion}`)) {
      throw new Error(`ImageMagick version ${imageMagickVersion} must be installed to run these tests. ` +
        'If this version is no longer available, the CI machine may need to be upgraded along with any screenshots ' +
        'that are checked into this repository.',
      );
    }
    if (jest != null) {
      // Set default test timeout to be larger, since PDF manipulation and comparison can take tens of seconds
      jest.setTimeout(60 * 1000);
    }
  }

  public getTempPDFPath() {
    return this.tmpPdfFile.name;
  }

  private async requirePDF(url: string) {
    if (this.pdfImage == null) {
      const response = await fetch(url, {
        ...this.fetchOptions,
        headers: {
          ...this.fetchOptions.headers,
          'x-pdf-test-metadata': 'true',
        },
      });
      const testMetadataString = response.headers.get('x-pdf-test-metadata');
      if (testMetadataString != null) {
        this.pdfTestMetadata = JSON.parse(testMetadataString);
      }
      if (response.ok) {
        await pipeline(response.body, fs.createWriteStream(this.tmpPdfFile.name));
        this.pdfImage = new PDFImage(this.tmpPdfFile.name, {
          convertOptions: {
            '-density': `${PNG_PIXELS_PER_INCH}`,
          },
        });
      } else {
        throw new Error('Failed to fetch PDF: ' + response.statusText);
      }
    }
  }

  private async fetchPDF(
    url: string,
    page: number,
  ) {
    await this.requirePDF(url);
    return this.pdfImage!.convertPage(page);
  }

  private async getPageImagePath(page: number): Promise<string> {
    if (this.pageImages[page] == null) {
      this.pageImages[page] = this.fetchPDF(this.pdfUrl, page);
    }
    return this.pageImages[page];
  }

  public async reloadPages() {
    this.pageImages = {};
    this.pdfImage = undefined;
    this.pdfTestMetadata = undefined;
  }

  public async matchesAsset(options: TestIDComparisonOptions): Promise<boolean> {
    await this.requirePDF(this.pdfUrl);
    if (this.pdfTestMetadata?.[options.testID] == null) {
      throw new Error('Test ID was not found in PDF: ' + options.testID);
    }
    const {pageNumber, layout} = this.pdfTestMetadata?.[options.testID];
    return this.frameMatchesAsset({
      frame: layout,
      page: pageNumber - 1,
      roundFrameInward: options.roundFrameInward,
      expectedAssetPath: options.expectedAssetPath,
    });
  }

  public async frameMatchesAsset(options: FrameComparisonOptions): Promise<boolean> {
    const page = options.page ?? 0;
    const pageImagePath = await this.getPageImagePath(page);
    const pageImage = sharp(pageImagePath);

    let actualImage: Sharp;
    let actualWidth: number;
    let actualHeight: number;
    if (options.frame != null) {
      const {left, top, width, height} = options.frame;
      const widthInPixels = toPixel(width);
      const heightInPixels = toPixel(height);

      const leftInPixels = toPixel(left);
      const topInPixels = toPixel(top);
      const adjustOrigin = options.roundFrameInward ? Math.ceil : Math.floor;
      const adjustDimension = options.roundFrameInward ? Math.floor : Math.ceil;
      const adjustedLeft = adjustOrigin(leftInPixels);
      const adjustedTop = adjustOrigin(topInPixels);
      actualWidth = adjustDimension(widthInPixels + (leftInPixels - adjustedLeft));
      actualHeight = adjustDimension(heightInPixels + (topInPixels - adjustedTop));

      actualImage = pageImage.extract({
        left: adjustedLeft,
        top: adjustedTop,
        width: actualWidth,
        height: actualHeight,
      });
    } else {
      actualImage = pageImage;
      const actualMetadata = await actualImage.metadata();
      actualWidth = actualMetadata.width!;
      actualHeight = actualMetadata.height!;
    }

    const actualImagePath = await writeImageToTempFile(actualImage, 'actual');
    const actualImagePng = PNG.sync.read(fs.readFileSync(actualImagePath));
    const actualImagePathOnFailure = options.expectedAssetPath.replace(/\.png$/, '.actual.png');

    let expectedImagePng: PNGWithMetadata;
    try {
      expectedImagePng = PNG.sync.read(fs.readFileSync(options.expectedAssetPath));
    } catch (err) {
      console.log('Error reading expected file:', err);
      if (process.env.OVERWRITE_EXPECTED_IMAGES === 'true') {
        fs.copyFileSync(actualImagePath, options.expectedAssetPath);
      } else {
        fs.copyFileSync(actualImagePath, actualImagePathOnFailure);
      }
      return false;
    }

    if (expectedImagePng.width !== actualImagePng.width || expectedImagePng.height !== actualImagePng.height) {
      if (process.env.OVERWRITE_EXPECTED_IMAGES === 'true') {
        fs.copyFileSync(actualImagePath, options.expectedAssetPath);
      } else {
        fs.copyFileSync(actualImagePath, actualImagePathOnFailure);
      }
      console.log(`Size mismatch. Expected: ${expectedImagePng.width}x${expectedImagePng.height}, ` +
        `Actual: ${actualImagePng.width}x${actualImagePng.height}`);
      console.log('               Actual path: ' + actualImagePath);
      console.log('               Actual image : ' + fs.readFileSync(actualImagePath).toString('base64'));
      return false;
    }

    const maxDataLength = actualWidth * actualHeight * 4;
    const diffBuffer = Buffer.allocUnsafe(maxDataLength);

    const pixelDiffCount = pixelmatch(
      expectedImagePng.data,
      actualImagePng.data,
      diffBuffer,
      actualWidth,
      actualHeight,
      {threshold: 0, includeAA: true},
    );
    const matches = (pixelDiffCount === 0);
    if (!matches) {
      if (process.env.OVERWRITE_EXPECTED_IMAGES === 'true') {
        fs.copyFileSync(actualImagePath, options.expectedAssetPath);
      } else {
        fs.copyFileSync(actualImagePath, actualImagePathOnFailure);
      }
      const diffImage = sharp(diffBuffer, {raw: {width: actualWidth, height: actualHeight, channels: 4}}).png();
      const diffImagePath = await writeImageToTempFile(diffImage, 'diff');
      const pdfPath = this.tmpPdfFile.name;
      console.log('Image mismatch. Pixel Δ count: ' + pixelDiffCount);
      console.log('                Actual image : ' + fs.readFileSync(actualImagePath).toString('base64'));
      console.log('                Diff image   : ' + fs.readFileSync(diffImagePath).toString('base64'));
      console.log('                Actual PDF   : ' + fs.readFileSync(pdfPath).toString('base64'));
    }
    if (process.env.PRINT_TEMP_PDF_PATH) {
      console.log('PDF Path: ' + this.getTempPDFPath());
    }
    return matches;
  }
}
