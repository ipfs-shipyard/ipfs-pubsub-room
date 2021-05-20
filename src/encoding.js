'use strict'

const uint8ArrayFromString = require('uint8arrays/from-string')

module.exports = (_message) => {
  let message
  if (_message instanceof Uint8Array) {
    message = _message
  } else if (_message instanceof ArrayBuffer) {
    message = new Uint8Array(_message)
  } else if (typeof _message === 'string') {
    message = uint8ArrayFromString(_message)
  } else {
    throw new Error('unable to encode message')
  }
  return message
}
