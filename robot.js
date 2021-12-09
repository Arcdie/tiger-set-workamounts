const ioHook = require('iohook');
const robot = require('robotjs');

const start = () => {
  ioHook.on('mouseclick', event => {
    console.log('event', event);
  });

  //Register and start hook
  ioHook.start();

  // Type "Hello World".
  // robot.typeString("Hello World");

  // Press enter.
  // robot.keyTap("enter");
};

start();
