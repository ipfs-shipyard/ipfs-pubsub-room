'use strict'

const uint8ArrayToString = require('uint8arrays/to-string')

module.exports = (_message) => {
  let message = _message
  if (message.constructor === Uint8Array) {
    message = String(uint8ArrayToString(message))
  }
  return message
}
