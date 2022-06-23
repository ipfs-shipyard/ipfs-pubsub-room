'use strict'

const { fromString: uint8arrayFromString } = require('uint8arrays/from-string')

module.exports = (_message) => {
  let message = _message
  if (!(message instanceof Uint8Array)) {
    message = uint8arrayFromString(message)
  }
  return message
}
