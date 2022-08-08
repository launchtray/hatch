import {createWebAppDriver, detectTestName, WebAppDriver, WebAppDriverOptions} from './WebAppDriver';
import WebScreenRecorder, {WebScreenRecorderOptions} from './WebScreenRecorder';

export type WebTestContextOptions = WebAppDriverOptions & WebScreenRecorderOptions;

export default class WebTestContext {
  private options: WebTestContextOptions;
  private webAppDriver?: WebAppDriver;
  private screenRecorder?: WebScreenRecorder;

  constructor(options: WebTestContextOptions = {}) {
    this.options = options;
  }

  public async openWebDriver(options: WebTestContextOptions = {}) {
    const isHeadless = options.headless ?? false;
    this.options = {
      ...options,
      testName: detectTestName(options.testName),
    };
    if (!isHeadless && this.screenRecorder == null && this.options.artifactsPath != null) {
      this.screenRecorder = new WebScreenRecorder(this.options);
    }
    // When screen recording, we're not actually headless, but are displaying to Xvfb
    this.options.headless = (this.screenRecorder?.recording !== true);
    if (this.webAppDriver == null) {
      this.webAppDriver = await createWebAppDriver(this.options);
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
