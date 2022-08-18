const fs = require('fs').promises;
const webdriver = require('selenium-webdriver');
const { By } = require('selenium-webdriver');

const chrome = require('selenium-webdriver/chrome');
const chromium = require('chromium');
require('chromedriver');
const XLSX = require('xlsx');

const exclude = ['улица', 'проспект', 'площадь', 'переулок', 'проезд']
const clearStreetName = (street) => {
    return street && exclude.reduce((acc, word) => acc.replace(word, ''), street).trim();
}

const clearNumber = (number) => {
    if (!number) {
        return undefined;
    }
    const [res] = [...number.matchAll(/\s(\d+\/?\d*[^кКсС\d\s\/]?)[кКсС]?(\d+)?$/)];
    return res && [res[1], res[2]];
}

const isMatches = (address, street, number) => {
    if (address.includes(street)) {
        const parts = [] //address.split(',');
        const streetIndex = parts.findIndex((part) => part.includes(address));
        const addressNumbers = parts.slice(streetIndex + 1);
        if (parts[streetIndex + 1] ) {

        } else {
            return false;
        }
    }
}

const findMatch = (buildings, street, number) => {
    const streetCandidates = buildings.filter((building) => ( false
        || building['Адрес'         ].includes(street)
        || building['Местоположение'].includes(street)
    ));
    if (number) {
        return streetCandidates.filter((building) => ( false
            || building['Адрес'         ].match(RegExp(`${street}([^\\d,]+)?,[^\\d,]+${number[0] || ''}[^\\d]+${number[1] || ''}`))
            || building['Местоположение'].match(RegExp(`${street}([^\\d,]+)?,[^\\d,]+${number[0] || ''}[^\\d]+${number[1] || ''}`))
        ));
    }
    return streetCandidates;
}

const saveScreenshot = async (driver) => {
    const base64 = await driver.takeScreenshot();
    const buffer = Buffer.from(base64, 'base64');
    await fs.writeFile('screenshot.png', buffer);
}

async function start() {
    let options = new chrome.Options();
    options.setChromeBinaryPath(chromium.path);
    options.addArguments('--headless');
    options.addArguments('--disable-gpu');
    options.addArguments('--window-size=1280,960');

    console.log('Starting ChromeDriver...')
    const driver = await new webdriver.Builder()
        .forBrowser('chrome')
        .setChromeOptions(options)
        .build();
    console.log('Success!');

    console.log('Opening Buildings List...');
    const workbook = XLSX.readFile('buildings.xlsx');
    const buildings = XLSX.utils.sheet_to_json(workbook.Sheets['Лист1']);
    console.log('Success!');

    console.log('Fetching CIAN page');
    await driver.get('https://www.cian.ru/cat.php?deal_type=sale&engine_version=2&offer_type=offices&office_type%5B0%5D=2&p=8&region=1&sort=creation_date_asc');
    // saveScreenshot(driver);
                                                         //*[@id="frontend-serp"]/div/div[6]/article[1]/div[1]/div[2]/div[1]/div/div[2]/div[4]
    const articles = await driver.findElements(By.xpath('//*[@id="frontend-serp"]/div/div[6]/article[*]/div[1]/div[2]/div[1]/div/div[2]/div[4]'));
    console.log(`Success! ${articles.length} addresses obtained.`);
    const addresses = await Promise.all(articles.map((article) => article.getText()))
    addresses.map((address) => {
        const [city, _, region, station, street, number] = address.split(',');
        const cleanStreet = clearStreetName(street);
        const cleanNumber = clearNumber(number);
        if (cleanNumber) {
            console.log(address, ' => ', cleanStreet, cleanNumber);
            console.log(findMatch(buildings, cleanStreet, cleanNumber));
            console.log('\n');
        }
    })
    // console.log(addresses)

    await driver.quit();
}

start();