import {ChildProcessWithoutNullStreams, spawn} from 'child_process';
import fs from 'fs';
import path from 'path';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import Xvfb from 'xvfb';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import {sync as commandExists} from 'command-exists';

export default class WebScreenRecorder {
  public recording: boolean;
  private xvfb?: Xvfb;
  private recordingProcess?: ChildProcessWithoutNullStreams;
  private outputPath: string;
  private width: number;
  private height: number;

  constructor({outputPath, width, height}: {outputPath: string, width: number, height: number}) {
    this.outputPath = outputPath;
    this.width = width;
    this.height = height;
    this.recording = this.record();
  }

  private startRecording(display: string) {
    if (process.env.TEST_OUTPUT_PATH != null) {
      const basePath = path.dirname(this.outputPath);
      if (!fs.existsSync(basePath)) {
        fs.mkdirSync(basePath, {recursive: true});
      }
      this.recordingProcess = spawn('ffmpeg', [
        '-y',
        '-hide_banner',
        '-loglevel',
        'error',
        '-f',
        'x11grab',
        '-s',
        `${this.width}x${this.height}`,
        '-i',
        display,
        '-vcodec',
        'libx264',
        '-pix_fmt',
        'yuv420p',
        this.outputPath,
      ]);
      this.recordingProcess.stderr.on('data', (data) => {
        process.stderr.write(data);
      });
    }
  }

  private record(): boolean {
    const xvfbExists = commandExists('Xvfb') as boolean;
    const ffmpegExists = commandExists('ffmpeg') as boolean;
    const isMacOS = process.platform === 'darwin';
    if (!xvfbExists || !ffmpegExists || isMacOS) {
      const toolsState = JSON.stringify({xvfbExists, ffmpegExists, isMacOS});
      // eslint-disable-next-line no-console
      console.warn(`Not recording due to missing tools: ${toolsState}`);
      return false;
    }
    // eslint-disable-next-line @typescript-eslint/naming-convention
    this.xvfb = new Xvfb({xvfb_args: ['-screen', '0', `${this.width}x${this.height}x24`]});
    this.xvfb.startSync();
    this.startRecording(this.xvfb.display());
    return true;
  }

  public close() {
    this.recordingProcess?.kill('SIGINT');
    delete this.recordingProcess;
    this.xvfb?.stopSync();
    delete this.xvfb;
  }
}
