const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { execSync } = require('child_process');

let settings = {
  areModulesLoaded: false,
  pathToTigerSettingsFolder: false,
};

const updateSettings = () => {
  fs.writeFileSync('settings.json', JSON.stringify(settings));
};

if (fs.existsSync('settings.json')) {
  settings = fs.readFileSync('settings.json', 'utf8');
  settings = JSON.parse(settings);
} else {
  fs.writeFileSync('settings.json', JSON.stringify(settings));
}

if (!settings.areModulesLoaded) {
  execSync('npm i --loglevel=error');
  settings.areModulesLoaded = true;
  updateSettings();
}

const xml2js = require('xml2js');

const {
  getExchangeInfo,
} = require('./binance/get-exchange-info');

const {
  getInstrumentsPrices,
} = require('./binance/get-instruments-prices');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

let depositForCalculate = false;

const start = async () => {
  if (!settings.pathToTigerSettingsFolder) {
    return askQuestion('whereTigerSettingsFolder');
  }

  const filesNames = fs.readdirSync(settings.pathToTigerSettingsFolder);

  let pathsToSettingsFiles = [];

  filesNames.forEach(fileName => {
    if (fileName.includes('Charting_')) {
      pathsToSettingsFiles.push(`${settings.pathToTigerSettingsFolder}/${fileName}`);
    }
  });

  if (!pathsToSettingsFiles.length) {
    console.log('Не могу найти файл конфигурации в папке');
    return false;
  }

  if (!depositForCalculate) {
    return askQuestion('depositForCalculate');
  }

  const resultGetExchangeInfo = await getExchangeInfo();

  if (!resultGetExchangeInfo || !resultGetExchangeInfo.status) {
    console.log(resultGetExchangeInfo.message || 'Cant resultGetExchangeInfo');
    return false;
  }

  const resultGetInstrumentsPrices = await getInstrumentsPrices();

  if (!resultGetInstrumentsPrices || !resultGetInstrumentsPrices.status) {
    console.log(resultGetInstrumentsPrices.message || 'Cant resultGetInstrumentsPrices');
    return false;
  }

  const exchangeInfo = resultGetExchangeInfo.result;
  const instrumentsPrices = resultGetInstrumentsPrices.result;

  const workAmounts = [];

  for (let i = 1; i < 6; i += 1) {
    workAmounts.push(Math.floor(depositForCalculate * i));
  }

  for await (const pathToSettingsFile of pathsToSettingsFiles) {
    const fileContent = fs.readFileSync(pathToSettingsFile, 'utf8');
    const parsedContent = await xml2js.parseStringPromise(fileContent);

    const workingSymbols = [];

    const size1Arr = parsedContent.ChartingSettings.ChartSettings[0]['d2p1:TradeSettings'][0]['d2p1:Size1Param'][0]['d4p1:Values'][0]['d5p1:KeyValueOfstringdouble'];
    const size2Arr = parsedContent.ChartingSettings.ChartSettings[0]['d2p1:TradeSettings'][0]['d2p1:Size2Param'][0]['d4p1:Values'][0]['d5p1:KeyValueOfstringdouble'];
    const size3Arr = parsedContent.ChartingSettings.ChartSettings[0]['d2p1:TradeSettings'][0]['d2p1:Size3Param'][0]['d4p1:Values'][0]['d5p1:KeyValueOfstringdouble'];
    const size4Arr = parsedContent.ChartingSettings.ChartSettings[0]['d2p1:TradeSettings'][0]['d2p1:Size4Param'][0]['d4p1:Values'][0]['d5p1:KeyValueOfstringdouble'];
    const size5Arr = parsedContent.ChartingSettings.ChartSettings[0]['d2p1:TradeSettings'][0]['d2p1:Size5Param'][0]['d4p1:Values'][0]['d5p1:KeyValueOfstringdouble'];

    size1Arr.forEach(e => {
      const symbolName = e['d5p1:Key'][0].split('_')[0];
      workingSymbols.push(symbolName);
    });

    if (!workingSymbols.length) {
      console.log(`В файле конфигурации нет инструментов; path: ${pathToSettingsFile}`);
      return false;
    }

    workingSymbols.forEach(workingSymbolName => {
      const exchangeInfoSymbol = exchangeInfo.symbols.find(
        symbol => symbol.symbol === workingSymbolName,
      );

      if (!exchangeInfoSymbol) {
        console.log(`Не могу найти совпадение; symbol: ${workingSymbolName}`);
        return true;
      }

      if (!exchangeInfoSymbol.filters || !exchangeInfoSymbol.filters.length || !exchangeInfoSymbol.filters[2].stepSize) {
        console.log(`Не могу найти stepSize; symbol: ${workingSymbolName}`);
        return null;
      }

      const instrumentPriceDoc =  instrumentsPrices.find(doc => doc.symbol === workingSymbolName);

      if (!instrumentPriceDoc) {
        console.log(`Не могу найти цену; symbol: ${workingSymbolName}`);
        return null;
      }

      const stepSize = parseFloat(exchangeInfoSymbol.filters[2].stepSize);
      const instrumentPrice = parseFloat(instrumentPriceDoc.price);
      const stepSizePrecision = getPrecision(stepSize);

      const result = workAmounts.map(workAmount => {
        let tmp = workAmount / instrumentPrice;

        if (tmp < stepSize) {
          tmp = stepSize;
        } else {
          const remainder = tmp % stepSize;

          if (remainder !== 0) {
            tmp -= remainder;

            if (tmp < stepSize) {
              tmp = stepSize;
            }
          }
        }

        if (!Number.isInteger(tmp)) {
          tmp = tmp.toFixed(stepSizePrecision);
        }

        return parseFloat(tmp, 10);
      });

      [size1Arr, size2Arr, size3Arr, size4Arr, size5Arr].forEach((arr, index) => {
        const value = result[index];

        arr.forEach(e => {
          const symbolName = e['d5p1:Key'][0].split('_')[0];

          if (symbolName !== workingSymbolName) {
            return true;
          }

          e['d5p1:Value'][0] = value;
        });
      });
    });

    parsedContent.ChartingSettings.ChartSettings[0]['d2p1:TradeSettings'][0]['d2p1:Size1Param'][0]['d4p1:Value'][0] = 1;
    parsedContent.ChartingSettings.ChartSettings[0]['d2p1:TradeSettings'][0]['d2p1:Size2Param'][0]['d4p1:Value'][0] = 2;
    parsedContent.ChartingSettings.ChartSettings[0]['d2p1:TradeSettings'][0]['d2p1:Size3Param'][0]['d4p1:Value'][0] = 3;
    parsedContent.ChartingSettings.ChartSettings[0]['d2p1:TradeSettings'][0]['d2p1:Size4Param'][0]['d4p1:Value'][0] = 4;
    parsedContent.ChartingSettings.ChartSettings[0]['d2p1:TradeSettings'][0]['d2p1:Size5Param'][0]['d4p1:Value'][0] = 5;

    const builder = new xml2js.Builder();
    const xml = builder.buildObject(parsedContent);
    fs.writeFileSync(pathToSettingsFile, xml);
  }

  console.log('Process was finished');
};

const askQuestion = (nameStep) => {
  if (nameStep === 'whereTigerSettingsFolder') {
    rl.question('Укажите полный путь к файлу настроек tiger\n', userAnswer => {
      if (!userAnswer) {
        console.log('Вы ничего не ввели');
        return askQuestion('whereTigerSettingsFolder');
      }

      if (!fs.existsSync(userAnswer)) {
        console.log('Не нашел папку');
        return askQuestion('whereTigerSettingsFolder');
      }

      settings.pathToTigerSettingsFolder = userAnswer;
      updateSettings();

      return start();
    });
  }

  if (nameStep === 'depositForCalculate') {
    rl.question('Введите ваш депозит\n', userAnswer => {
      if (!userAnswer) {
        console.log('Вы ничего не ввели');
        return askQuestion('depositForCalculate');
      }

      if (!userAnswer
        || Number.isNaN(parseFloat(userAnswer))
        || userAnswer < 0) {
          console.log('Невалидные данные');
          return askQuestion('depositForCalculate');
      }

      depositForCalculate = parseFloat(userAnswer);
      return start();
    });
  }
};

const getPrecision = (price) => {
  const dividedPrice = price.toString().split('.');

  if (!dividedPrice[1]) {
    return 0;
  }

  return dividedPrice[1].length;
};

start();
