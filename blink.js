// LED blink example.
// Copyright (C) 2015 imi.horvath@gmail.com
//
// You do not need to build a circuit for this examle, since it is
// already hardwired on the board.
//
// This code below will blink the on-board LED (Red) hardwired to the digital pin 13
// on your Arduino Yun.

var firmata = require('firmata');

var options = {
  serialport: {
    // baudRate: 115200
    baudRate: 57600
  }
};

var board = new firmata.Board('/dev/ttyATH0', options, function (err) {

  var ledPin = 13;
  var ledStatus = true;
  var HIGH = board.HIGH;
  var LOW = board.LOW;

  if (err) {
    console.log(err);
    return;
  }

  function cleanExit() {
    board.reset();
    process.exit();
  }

  process.on('SIGTERM', cleanExit);
  process.on('SIGINT', cleanExit);

  board.pinMode(ledPin, board.MODES.OUTPUT);

  setInterval(function () {
    
    board.digitalWrite(ledPin, ledStatus ? HIGH : LOW);

    ledStatus = !ledStatus;
  }, 500);

});
