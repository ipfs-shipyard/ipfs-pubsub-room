'use strict'

const uint8ArrayFromString = require('uint8arrays/from-string')

module.exports = (_message) => {
  let message = _message
  if (message.constructor !== Uint8Array) {
    message = uint8ArrayFromString(String(message))
  }
  return message
}
