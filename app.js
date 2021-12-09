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
let wasSkip = false;
let depositForCalculate = false;
let xAndYOfFirstWorkAmount = false;
let xAndYOfSecondWorkAmount = false;
let xAndYOfWorkAmountsPanel = false;
let setCursorToFirstInstrument = false;

const orderSteps = [
  'depositForCalculate',
  'xAndYOfWorkAmountsPanel',
  'skip',
  'xAndYOfFirstWorkAmount',
  'xAndYOfSecondWorkAmount',
  'setCursorToFirstInstrument',
];

const currentStep = {
  index: 0,
  stepName: orderSteps[0],

  incrementStep() {
    this.index += 1;
    this.stepName = orderSteps[this.index];
  },
};

const start = async () => {
  if (!depositForCalculate) {
    return askQuestion('depositForCalculate');
  }

  if (!xAndYOfWorkAmountsPanel) {
    console.log('Нажмите мышкой на место, где находится панель объемов');
    return true;
  }

  if (!wasSkip) {
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

  if (!setCursorToFirstInstrument) {
    console.log('Нажмите мышкой на 1-й инструмент в списке');
    return true;
  }

  console.log('Процесс пошел..');

  /*
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
  */

  const workAmounts = [];

  for (let i = 1; i < 6; i += 1) {
    workAmounts.push(Math.floor(depositForCalculate * i));
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
    x, y,
  } = event;

  switch (currentStep.stepName) {
    case 'skip': {
      wasSkip = true;
      currentStep.incrementStep();
      start();
      break;
    }

    case 'xAndYOfWorkAmountsPanel': {
      xAndYOfWorkAmountsPanel = [x, y];
      console.log('xAndYOfWorkAmountsPanel', xAndYOfWorkAmountsPanel);
      currentStep.incrementStep();
      start();
      break;
    }

    case 'xAndYOfFirstWorkAmount': {
      xAndYOfFirstWorkAmount = [x, y];
      console.log('xAndYOfFirstWorkAmount', xAndYOfFirstWorkAmount);
      currentStep.incrementStep();
      start();
      break;
    }

    case 'xAndYOfSecondWorkAmount': {
      xAndYOfSecondWorkAmount = [x, y];
      console.log('xAndYOfSecondWorkAmount', xAndYOfSecondWorkAmount);
      currentStep.incrementStep();
      start();
      break;
    }

    case 'xAndYOfSecondWorkAmount': {
      xAndYOfSecondWorkAmount = [x, y];
      console.log('xAndYOfSecondWorkAmount', xAndYOfSecondWorkAmount);
      currentStep.incrementStep();
      start();
      break;
    }

    case 'setCursorToFirstInstrument': {
      setCursorToFirstInstrument = true;
      start();
      break;
    }

    default: break;
  }
});

start();

/*
setTimeout(() => {
  for (let i = 0; i < 10; i += 1) {
    robot.keyTap('down');
    robot.keyTap('c', ['command']);
    console.log(ncp.paste());
  }
}, 5000);
*/
