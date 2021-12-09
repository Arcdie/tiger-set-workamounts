const fs = require('fs');
const robot = require('robotjs');
const { execSync } = require('child_process');

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

let lastX;
let lastY;

setInterval(() => {

  const {
    x, y,
  } = robot.getMousePos();

  if (x !== lastX || y !== lastY) {
    lastX = x;
    lastY = y;

    console.log(`x: ${x}, y: ${y}`);
  }
}, 1000);
