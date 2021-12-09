const ioHook = require('iohook');
const robot = require('robotjs');

const start = () => {
  ioHook.on('mouseclick', (event) => {
    console.log('here', event);
  });

  ioHook.start();


};

start();
