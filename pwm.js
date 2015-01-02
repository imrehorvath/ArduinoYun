// PWM glowing example.
// Copyright (C) 2015 imi.horvath@gmail.com
//
// Build a circuit using a breadboard like this:
// Arduino Yun digital pin 11 (PWM) --> 270 R 5% --> 5 mm LED --> Arduino Yun GND
//
// This code below will cause the LED to glow first brighter and brighter gradually,
// then it will glow dimmer and dimmer till off.
// And then, this will repeat forever.

var firmata = require('firmata');
var board = new firmata.Board('/dev/ttyATH0', function (err) {

  var pwmPin = 11;
  var value = 0;
  var up = true;
  var incr = 10;

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

  board.pinMode(pwmPin, board.MODES.PWM);
  
  setInterval(function () {

    board.analogWrite(pwmPin, value);

    if (up) {
      if (value < 250) {
        value += incr;
      } else {
        up = false;
        value -= incr;
      }
    } else {
      if (value > 0) {
        value -= incr;
      } else {
        up = true;
        value += incr;
      }
    }
  }, 125);

});
