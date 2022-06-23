import { fromString as uint8arrayFromString } from 'uint8arrays/from-string'

export default (message) => {
  if (!(message instanceof Uint8Array)) {
    return uint8arrayFromString(message)
  }

  return message
}
