import {createWebAppDriver, detectTestName, WebAppDriver, WebAppDriverOptions} from './WebAppDriver';
import {WebScreenRecorder, WebScreenRecorderOptions} from './WebScreenRecorder';
import {defaultWindowSize} from './constants';

export type WebTestContextOptions = WebAppDriverOptions & WebScreenRecorderOptions;

export class WebTestContext {
  private webAppDriver?: WebAppDriver;
  private screenRecorder?: WebScreenRecorder;

  public async openWebDriver(options: WebTestContextOptions = {}) {
    const isHeadless = options.headless ?? false;
    const patchedOptions = {
      ...options,
      windowSize: options.windowSize ?? defaultWindowSize,
      testName: detectTestName(options.testName),
    };
    if (!isHeadless && this.screenRecorder == null && patchedOptions.artifactsPath != null) {
      this.screenRecorder = new WebScreenRecorder(patchedOptions);
    }
    // When screen recording, we're not actually headless, but are displaying to Xvfb
    patchedOptions.headless = (this.screenRecorder?.recording !== true);
    if (this.webAppDriver == null) {
      this.webAppDriver = await createWebAppDriver(patchedOptions);
    }
    return this.webAppDriver;
  }

  // Close only the web driver session
  public async closeWebDriver() {
    if (this.webAppDriver != null) {
      const driver = this.webAppDriver;
      delete this.webAppDriver;
      await driver.quit();
    }
  }

  public async close() {
    try {
      await this.closeWebDriver();
    } finally {
      this.screenRecorder?.close();
      delete this.screenRecorder;
    }
  }
}
