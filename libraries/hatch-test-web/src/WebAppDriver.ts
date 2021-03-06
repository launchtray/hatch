import {
  Builder,
  By,
  Locator,
  until,
  WebDriver,
  WebElement,
} from 'selenium-webdriver';

export interface WebDriverOptions {
  browserName?: string;
  headless?: boolean;
  enableDockerCompatibility?: boolean;
  windowSize?: {width: number, height: number};
  patchBrowserOptions?: (browserOptions: unknown, webDriverOptions: WebDriverOptions) => void;
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
  public static async create(options?: WebDriverOptions): Promise<WebAppDriver> {
    const browserName = options?.browserName ?? 'chrome';
    const headless = options?.headless ?? true;
    const enableDockerCompatibility = options?.enableDockerCompatibility ?? true;

    const browserBuilder = new Builder().forBrowser(browserName);
    const browserModule = await import(`selenium-webdriver/${browserName}`);
    const browserOptions = new browserModule.Options();
    if (headless) {
      browserOptions.headless?.();
    }
    if (enableDockerCompatibility) {
      browserOptions.addArguments('no-sandbox');
      browserOptions.addArguments('disable-dev-shm-usage');
    }
    if (options?.windowSize != null) {
      if (browserName === 'chrome') {
        browserOptions.addArguments(`window-size=${options.windowSize.width},${options.windowSize.height}`);
      } else if (browserName === 'firefox') {
        browserOptions.addArguments(`width=${options.windowSize.width}`);
        browserOptions.addArguments(`height=${options.windowSize.height}`);
      }
    }
    if (options?.patchBrowserOptions != null) {
      options?.patchBrowserOptions?.(browserOptions, options);
    }
    const capitalizedBrowserName = browserName.charAt(0).toUpperCase() + browserName.slice(1);
    const driverBuilder = browserBuilder[`set${capitalizedBrowserName}Options`](browserOptions);
    return extendWebDriver(await driverBuilder.build());
  }

  public abstract waitForElement(locator: ElementLocator): Promise<WebElement>;
}

const extendWebDriver = (driver: WebAppDriver): WebAppDriver => {
  // eslint-disable-next-line no-param-reassign -- intentional mutation
  driver.waitForElement = async (locator: ElementLocator): Promise<WebElement> => {
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
  return driver;
};
