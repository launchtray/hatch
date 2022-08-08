import {ChildProcessWithoutNullStreams, spawn} from 'child_process';
import fs from 'fs';
import path from 'path';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import Xvfb from 'xvfb';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import {sync as commandExists} from 'command-exists';
import {detectTestName} from './WebAppDriver';

export const defaultWindowSize = {width: 1920, height: 1200};

export interface WebScreenRecorderOptions {
  testName?: string,
  artifactsPath?: string,
  windowSize?: {width: number, height: number};
}

export class WebScreenRecorder {
  public recording: boolean;
  private xvfb?: Xvfb;
  private recordingProcess?: ChildProcessWithoutNullStreams;

  constructor(options: WebScreenRecorderOptions = {}) {
    this.recording = this.record(options);
  }

  private startRecording(options: WebScreenRecorderOptions, display: string) {
    if (options.artifactsPath != null) {
      const basePath = path.dirname(options.artifactsPath);
      if (!fs.existsSync(basePath)) {
        fs.mkdirSync(basePath, {recursive: true});
      }
      const testName = detectTestName(options.testName);
      const videoFilename = `${testName}.mp4`;
      const outputPath = path.join(options.artifactsPath, videoFilename);
      const windowSize = options.windowSize ?? defaultWindowSize;
      this.recordingProcess = spawn('ffmpeg', [
        '-y',
        '-hide_banner',
        '-loglevel',
        'error',
        '-f',
        'x11grab',
        '-s',
        `${windowSize.width}x${windowSize.height}`,
        '-i',
        display,
        '-vcodec',
        'libx264',
        '-pix_fmt',
        'yuv420p',
        outputPath,
      ]);
      this.recordingProcess.stderr.on('data', (data) => {
        process.stderr.write(data);
      });
    }
  }

  private record(options: WebScreenRecorderOptions): boolean {
    const xvfbExists = commandExists('Xvfb') as boolean;
    const ffmpegExists = commandExists('ffmpeg') as boolean;
    const isMacOS = process.platform === 'darwin';
    if (!xvfbExists || !ffmpegExists || isMacOS) {
      const toolsState = JSON.stringify({xvfbExists, ffmpegExists, isMacOS});
      // eslint-disable-next-line no-console
      console.warn(`Not screen recording due OS or missing tools. State: ${toolsState}`);
      return false;
    }
    const windowSize = options.windowSize ?? defaultWindowSize;
    // eslint-disable-next-line @typescript-eslint/naming-convention
    this.xvfb = new Xvfb({xvfb_args: ['-screen', '0', `${windowSize.width}x${windowSize.height}x24`]});
    this.xvfb.startSync();
    this.startRecording(options, this.xvfb.display());
    return true;
  }

  public close() {
    this.recordingProcess?.kill('SIGINT');
    delete this.recordingProcess;
    this.xvfb?.stopSync();
    delete this.xvfb;
  }
}
