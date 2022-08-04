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

export interface WebDriverOptions {
  testName?: string,
  artifactsPath?: string,
  headless?: boolean;
  windowSize?: {width: number, height: number};
  patchBuilder?: (builder: Builder, options: WebDriverOptions) => Builder;
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

export abstract class WebAppDriver extends WebDriver {
  public static async create(options: WebDriverOptions = {}): Promise<WebAppDriver> {
    const {headless} = options;
    const specInfo = getCurrentSpecInfo();
    let defaultTestName = 'unknown';
    if (specInfo.suiteName != null && specInfo.specName != null) {
      defaultTestName = `${specInfo.suiteName}.${specInfo.specName}`;
    }
    const testName = options.testName ?? defaultTestName ?? 'unknown';
    const windowSize = options.windowSize ?? {width: 1920, height: 1200};
    const artifactsPath = options.artifactsPath ?? process.env.TEST_OUTPUT_PATH;
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

    const loggingPref = new logging.Preferences();
    loggingPref.setLevel(logging.Type.BROWSER, logging.Level.ALL);
    loggingPref.setLevel(logging.Type.DRIVER, logging.Level.ALL);
    loggingPref.setLevel(logging.Type.PERFORMANCE, logging.Level.ALL);
    chromeOptions.setLoggingPrefs(loggingPref);

    if (artifactsPath != null) {
      const chromeLog = `${testName}.chrome.log`;
      const driverLog = `${testName}.chromedriver.log`;
      const basePath = path.join(artifactsPath, 'analytics-portal');
      if (!fs.existsSync(basePath)) {
        fs.mkdirSync(basePath, {recursive: true});
      }
      chromeOptions.setChromeLogFile(path.join(basePath, chromeLog));
      chromedriverBuilder.loggingTo(path.join(basePath, driverLog));
    }
    chromeOptions.addArguments(`window-size=${windowSize.width},${windowSize.height}`);
    chromeOptions.addArguments('window-position=0,0');

    const firefoxOptions = new firefox.Options();
    firefoxOptions.addArguments(`width=${windowSize.width}`);
    firefoxOptions.addArguments(`height=${windowSize.height}`);

    const defaultBuilderPatcher = (builder: Builder) => builder;
    const patchBuilder = options.patchBuilder ?? defaultBuilderPatcher;

    const driverBuilder = patchBuilder(
      new Builder()
        .forBrowser('chrome')
        .setChromeOptions(chromeOptions)
        .setFirefoxOptions(firefoxOptions)
        .setChromeService(chromedriverBuilder),
      options,
    );

    const driver = await driverBuilder.build();
    return extendWebDriver(driver);
  }

  public abstract waitForElement(locator: ElementLocator): Promise<WebElement>;
}

const extendWebDriver = (driver: WebDriver): WebAppDriver => {
  // eslint-disable-next-line no-param-reassign -- intentional mutation
  (driver as WebAppDriver).waitForElement = async (locator: ElementLocator): Promise<WebElement> => {
    let byClause: Locator;
    if (isElementLocatorByLocator(locator)) {
      byClause = locator.located;
    } else {
      byClause = By.css(`*[data-testid="${locator.testID}"]`);
    }
    const timeout = locator.timeoutInMS ?? 2000;
    const el = await driver.wait(until.elementLocated(byClause), timeout);
    return driver.wait(until.elementIsVisible(el), timeout);
  };
  return (driver as WebAppDriver);
};
