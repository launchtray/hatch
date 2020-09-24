import {WebAppDriver} from '@launchtray/hatch-test-web';

describe('webdriver', () => {
  let driver: WebAppDriver;

  beforeAll(async () => {
    driver = await WebAppDriver.create();
    await driver.get('http://localhost:3000/');
  });

  afterAll(async () => {
    await driver.quit();
  });

  test('test', async () => {
    const btn = await driver.waitForElement({testID: 'helloButton'});
    await btn.click();

    const output = await driver.waitForElement({testID: 'homeLink'});
    const outputVal = await output.getText();

    expect(outputVal).toEqual('Go home');
  });
});
