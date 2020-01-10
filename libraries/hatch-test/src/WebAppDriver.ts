import {
  Builder,
  By,
  until,
  WebDriver,
  WebElement,
} from 'selenium-webdriver';

export interface WebDriverOptions {
  browserName?: string;
  headless?: boolean;
}

export interface ElementLocatorBase {
  timeoutInMS?: number;
}

export interface ElementLocatorByTestID extends ElementLocatorBase {
  testID: string;
}

export type ElementLocator =
  | ElementLocatorByTestID;

export abstract class WebAppDriver extends WebDriver {
  public static async create(options?: WebDriverOptions): Promise<WebAppDriver> {
    const browserName = options?.browserName ?? 'chrome';
    const headless = options?.headless ?? true;

    const browserBuilder = new Builder().forBrowser(browserName);
    const browserModule = await import('selenium-webdriver/' + browserName);
    const browserOptions = new browserModule.Options();
    if (headless) {
      browserOptions.headless?.();
    }
    const capitalizedBrowserName = browserName.charAt(0).toUpperCase() + browserName.slice(1);
    const driverBuilder = browserBuilder['set' + capitalizedBrowserName + 'Options'](browserOptions);
    return extendWebDriver(await driverBuilder.build());
  }

  public abstract waitForElement(locator: ElementLocator): Promise<WebElement>;
}

const extendWebDriver = (driver: WebAppDriver): WebAppDriver => {
  driver.waitForElement = async (locator: ElementLocator): Promise<WebElement> => {
    const testID = (locator as ElementLocatorByTestID).testID;
    const timeout = locator.timeoutInMS ?? 2000;
    const el = await driver.wait(until.elementLocated(By.css('*[data-testid="' + testID + '"]')), timeout);
    return driver.wait(until.elementIsVisible(el), timeout);
  };
  return driver;
};
