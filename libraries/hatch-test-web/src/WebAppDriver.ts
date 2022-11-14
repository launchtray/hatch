import {
  Builder,
  By,
  Locator,
  logging,
  until,
  WebDriver,
  WebElement,
} from 'selenium-webdriver';

import * as chrome from 'selenium-webdriver/chrome';
import * as firefox from 'selenium-webdriver/firefox';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import {findFreePort} from 'selenium-webdriver/net/portprober';
import path from 'path';
import fs from 'fs';
import {getCurrentSpecInfo} from '@launchtray/hatch-test';
import {delegate} from '@launchtray/hatch-util';
import {defaultWindowSize} from './constants';

export interface WebAppDriverOptions {
  testName?: string,
  artifactsPath?: string,
  headless?: boolean;
  windowSize?: {width: number, height: number};
  patchBuilder?: (builder: Builder, options: WebAppDriverOptions) => Builder | void;
}

export interface ElementLocatorBase {
  timeoutInMS?: number;
}

export interface ElementLocatorByTestID extends ElementLocatorBase {
  testID: string;
}

export interface ElementLocatorByLocator extends ElementLocatorBase {
  located: Locator;
}

const isElementLocatorByLocator = (locator: ElementLocator): locator is ElementLocatorByLocator => {
  return (locator as ElementLocatorByLocator).located != null;
};

export type ElementLocator =
  | ElementLocatorByLocator
  | ElementLocatorByTestID;

export const detectTestName = (testName?: string): string => {
  const specInfo = getCurrentSpecInfo();
  let defaultTestName = 'unknown';
  if (specInfo.suiteName != null && specInfo.specName != null) {
    defaultTestName = `${specInfo.suiteName}.${specInfo.specName}`;
  }
  return testName ?? defaultTestName ?? 'unknown';
};

export class WebAppDriverExtension {
  constructor(
    private testName: string,
    private webDriver?: WebDriver,
    private artifactsPath?: string,
  ) {}

  private getByClauseAndDriver(locator: ElementLocator): {byClause: Locator, webDriver: WebDriver} {
    if (this.webDriver == null) {
      throw new Error('WebDriver has is no longer valid. Was quit() called?');
    }
    let byClause: Locator;
    if (isElementLocatorByLocator(locator)) {
      byClause = locator.located;
    } else {
      byClause = By.css(`*[data-testid="${locator.testID}"]`);
    }
    return {byClause, webDriver: this.webDriver};
  }

  public async waitForElement(locator: ElementLocator): Promise<WebElement> {
    const {byClause, webDriver} = this.getByClauseAndDriver(locator);
    const timeout = locator.timeoutInMS ?? 2000;
    const el = await webDriver.wait(until.elementLocated(byClause), timeout);
    return webDriver.wait(until.elementIsVisible(el), timeout);
  }

  public async getVolatileExistenceOfElement(locator: ElementLocator) {
    const {byClause, webDriver} = this.getByClauseAndDriver(locator);
    try {
      const el = await webDriver.findElement(byClause);
      return el.isDisplayed();
    } catch (err) {
      return false;
    }
  }

  public async waitForNonExistenceOfElement(locator: ElementLocator) {
    if (this.webDriver == null) {
      throw new Error('WebDriver has is no longer valid. Was quit() called?');
    }
    const timeout = locator.timeoutInMS ?? 2000;
    await this.webDriver.wait(async () => {
      const exists = await this.getVolatileExistenceOfElement(locator);
      return !exists;
    }, timeout);
  }

  public async quit(): Promise<void> {
    if (this.webDriver == null) {
      throw new Error('WebDriver has is no longer valid. Was quit() already called?');
    }
    try {
      const logTypes = [
        logging.Type.BROWSER,
        logging.Type.DRIVER,
        logging.Type.PERFORMANCE,
      ];
      for (const logType of logTypes) {
        if (this.artifactsPath != null) {
          const browserPath = `${this.testName}.${logType}.log`;
          if (!fs.existsSync(this.artifactsPath)) {
            fs.mkdirSync(this.artifactsPath, {recursive: true});
          }
          const logPath = path.join(this.artifactsPath, browserPath);
          const logger = fs.createWriteStream(logPath, {flags: 'a'});
          const logEntries = await this.webDriver.manage().logs().get(logType);
          const writeLine = (line: string) => logger.write(`${line}\n`);
          for (const logEntry of logEntries) {
            writeLine(JSON.stringify(logEntry));
          }
          logger.end();
        }
      }
    } finally {
      const driver = this.webDriver;
      delete this.webDriver;
      await driver.quit();
    }
  }
}

export interface WebAppDriver extends
  Pick<WebAppDriverExtension, keyof WebAppDriverExtension>,
  Pick<WebDriver, keyof WebDriver> {}

export const createWebAppDriver = async (options: WebAppDriverOptions = {}): Promise<WebAppDriver> => {
  const {artifactsPath, headless} = options;
  const testName = detectTestName(options.testName);
  const windowSize = options.windowSize ?? defaultWindowSize;
  const port = await findFreePort();
  const chromedriverBuilder = new chrome.ServiceBuilder()
    .setPort(port)
    .enableVerboseLogging()
    .addArguments(
      '--append-log',
      '--readable-timestamp',
      '--disable-dev-shm-usage',
      '--allowed-ips=',
      '--whitelisted-ips=',
    );

  const chromeOptions = new chrome.Options();
  chromeOptions.addArguments('no-sandbox');
  chromeOptions.addArguments('disable-dev-shm-usage');
  chromeOptions.addArguments('disable-web-security');
  chromeOptions.addArguments('single-process');
  if (headless) {
    chromeOptions.addArguments('headless');
  }

  if (artifactsPath != null) {
    const loggingPref = new logging.Preferences();
    loggingPref.setLevel(logging.Type.BROWSER, logging.Level.ALL);
    loggingPref.setLevel(logging.Type.DRIVER, logging.Level.ALL);
    loggingPref.setLevel(logging.Type.PERFORMANCE, logging.Level.ALL);
    chromeOptions.setLoggingPrefs(loggingPref);

    const chromeLog = `${testName}.chrome.log`;
    const driverLog = `${testName}.chromedriver.log`;
    if (!fs.existsSync(artifactsPath)) {
      fs.mkdirSync(artifactsPath, {recursive: true});
    }
    chromeOptions.setChromeLogFile(path.join(artifactsPath, chromeLog));
    chromedriverBuilder.loggingTo(path.join(artifactsPath, driverLog));
  }
  chromeOptions.addArguments(`window-size=${windowSize.width},${windowSize.height}`);
  chromeOptions.addArguments('window-position=0,0');

  const firefoxOptions = new firefox.Options();
  firefoxOptions.addArguments(`width=${windowSize.width}`);
  firefoxOptions.addArguments(`height=${windowSize.height}`);

  const driverBuilder = new Builder()
    .forBrowser('chrome')
    .setChromeOptions(chromeOptions)
    .setFirefoxOptions(firefoxOptions)
    .setChromeService(chromedriverBuilder);

  const pachedBuilder = options.patchBuilder?.(driverBuilder, options) ?? driverBuilder;
  const driver = await pachedBuilder.build();
  return delegate(new WebAppDriverExtension(testName, driver, artifactsPath), driver);
};
