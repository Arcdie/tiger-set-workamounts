const fs = require('fs');
const robot = require('robotjs');
const ncp = require('copy-paste');
const readline = require('readline');
const { execSync } = require('child_process');
const mouseEvents = require('global-mouse-events');

let settings = {
  areModulesLoaded: false,
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

let isReady = false;
let depositForCalculate = false;
let xAndYOfFirstWorkAmount = false;
let xAndYOfSecondWorkAmount = false;
let xAndYOfThirdWorkAmount = false;
let xAndYOfFourthWorkAmount = false;
let xAndYOfFifthWorkAmount = false;
let xAndYOfWorkAmountsPanel = false;
let setCursorToFirstInstrument = false;

const orderSteps = [
  'depositForCalculate',
  'xAndYOfWorkAmountsPanel',
  'xAndYOfFirstWorkAmount',
  'xAndYOfSecondWorkAmount',
  'xAndYOfThirdWorkAmount',
  'xAndYOfFourthWorkAmount',
  'xAndYOfFifthWorkAmount',
  'setCursorToFirstInstrument',
  'end',
];

const currentStep = {
  index: 0,
  stepName: orderSteps[0],

  incrementStep() {
    this.index += 1;
    this.stepName = orderSteps[this.index];
  },
};

const DELAY = 300; // in ms

const start = async () => {
  if (!depositForCalculate) {
    return askQuestion('depositForCalculate');
  }

  if (!xAndYOfWorkAmountsPanel) {
    console.log('Нажмите мышкой на место, где находится панель объемов');
    return true;
  }

  if (!xAndYOfFirstWorkAmount) {
    console.log('Нажмите мышкой на место, где находится 1-й объем');
    return true;
  }

  if (!xAndYOfSecondWorkAmount) {
    console.log('Нажмите мышкой на место, где находится 2-й объем');
    return true;
  }

  if (!xAndYOfThirdWorkAmount) {
    console.log('Нажмите мышкой на место, где находится 3-й объем');
    return true;
  }

  if (!xAndYOfFourthWorkAmount) {
    console.log('Нажмите мышкой на место, где находится 4-й объем');
    return true;
  }

  if (!xAndYOfFifthWorkAmount) {
    console.log('Нажмите мышкой на место, где находится 5-й объем');
    return true;
  }

  if (!setCursorToFirstInstrument) {
    console.log('Нажмите мышкой на 1-й инструмент в списке');
    return true;
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

  const arrOfPositions = [
    xAndYOfFirstWorkAmount,
    xAndYOfSecondWorkAmount,
    xAndYOfThirdWorkAmount,
    xAndYOfFourthWorkAmount,
    xAndYOfFifthWorkAmount,
  ];

  let currentInstrumentName = '';

  while (1) {
    robot.keyTap('c', ['control']);
    const currentName = ncp.paste().toString().trim();

    if (currentName === currentInstrumentName) {
      break;
    }

    currentInstrumentName = currentName;

    const exchangeInfoSymbol = exchangeInfo.symbols.find(
      symbol => symbol.symbol === currentName,
    );

    if (!exchangeInfoSymbol) {
      console.log(`Не могу найти совпадение; symbol: ${currentName}`);
      robot.keyTap('down');
      await sleep(1000);
      continue;
    }

    if (!exchangeInfoSymbol.filters || !exchangeInfoSymbol.filters.length || !exchangeInfoSymbol.filters[2].stepSize) {
      console.log(`Не могу найти stepSize; symbol: ${currentName}`);
      robot.keyTap('down');
      await sleep(1000);
      continue;
    }

    const instrumentPriceDoc =  instrumentsPrices.find(doc => doc.symbol === currentName);

    if (!instrumentPriceDoc) {
      console.log(`Не могу найти цену; symbol: ${currentName}`);
      robot.keyTap('down');
      await sleep(1000);
      continue;
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

    robot.moveMouse(xAndYOfWorkAmountsPanel.x, xAndYOfWorkAmountsPanel.y);
    // await sleep(3000);
    robot.mouseClick();
    await sleep(DELAY);

    let index = 0;
    for await (const workAmountPosition of arrOfPositions) {
      robot.moveMouse(workAmountPosition.x, workAmountPosition.y);
      // await sleep(3000);
      robot.mouseClick('left', true);

      const sum = result[index].toString().replace('.', ',');

      ncp.copy(sum);
      await sleep(150);
      robot.keyTap('v', ['control']);

      // const delay = lSum > 4 ? DELAY * 2 : DELAY;
      // robot.typeString(result[index]);
      index += 1;

      await sleep(DELAY);
    }

    robot.moveMouse(xAndYOfWorkAmountsPanel.x, xAndYOfWorkAmountsPanel.y);

    // await sleep(3000);
    robot.mouseClick();
    await sleep(DELAY);

    robot.keyTap('down');
    await sleep(1000);
  }

  console.log('Process was finished');
};

const askQuestion = (nameStep) => {
  switch (nameStep) {
    case 'areYouReady': {
      rl.question('Все готово? (yes)\n', userAnswer => {
        if (!userAnswer) {
          console.log('Вы ничего не ввели');
          return askQuestion('areYouReady');
        }

        if (userAnswer !== 'yes') {
          return askQuestion('areYouReady');
        }

        isReady = true;
        return start();
      });

      break;
    }

    case 'depositForCalculate': {
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
        currentStep.incrementStep();
        return start();
      });

      break;
    }
  }

};

const getPrecision = (price) => {
  const dividedPrice = price.toString().split('.');

  if (!dividedPrice[1]) {
    return 0;
  }

  return dividedPrice[1].length;
};

mouseEvents.on('mouseup', (event) => {
  const {
    x, y, button,
  } = event;

  if (button === 2) {
    process.exit(1);
  }

  switch (currentStep.stepName) {
    case 'xAndYOfWorkAmountsPanel': {
      xAndYOfWorkAmountsPanel = { x, y };
      currentStep.incrementStep();
      return start();
      break;
    }

    case 'xAndYOfFirstWorkAmount': {
      xAndYOfFirstWorkAmount = { x, y };
      currentStep.incrementStep();
      return start();
      break;
    }

    case 'xAndYOfSecondWorkAmount': {
      xAndYOfSecondWorkAmount = { x, y };
      currentStep.incrementStep();
      return start();
      break;
    }

    case 'xAndYOfThirdWorkAmount': {
      xAndYOfThirdWorkAmount = { x, y };
      currentStep.incrementStep();
      return start();
      break;
    }

    case 'xAndYOfFourthWorkAmount': {
      xAndYOfFourthWorkAmount = { x, y };
      currentStep.incrementStep();
      return start();
      break;
    }

    case 'xAndYOfFifthWorkAmount': {
      xAndYOfFifthWorkAmount = { x, y };
      currentStep.incrementStep();
      return start();
      break;
    }

    case 'setCursorToFirstInstrument': {
      setCursorToFirstInstrument = true;
      currentStep.incrementStep();
      return start();
      break;
    }

    default: break;
  }
});

const sleep = ms => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

start();

/*
setTimeout(() => {
  for (let i = 0; i < 10; i += 1) {
    robot.keyTap('down');
    robot.keyTap('c', ['control']);
    console.log(ncp.paste());
  }
}, 5000);
*/
