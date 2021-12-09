const ioHook = require('iohook');

const start = () => {
  ioHook.on('mouseclick', (event) => {
    console.log('here', event); // { type: 'mousemove', x: 700, y: 400 }
  });

  ioHook.start();

  const id = ioHook.registerShortcut(
    [29, 65],
    (keys) => {
      console.log('Shortcut called with keys:', keys);
    },
    (keys) => {
      console.log('Shortcut has been released!');
    }
  );
};

start();
