'use strict';

var alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz_';

function generateId(length) {
  if (!length) {
    length = 8;
  }
  var res = '';
  for (var i = 0; i < length; ++i) {
    res += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return res;
}

module.exports = generateId;
