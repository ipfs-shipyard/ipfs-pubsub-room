'use strict'

module.exports = (peer) => {
  if (peer.id) {
    peer = peer.id
  }
  return peer.toString()
}
