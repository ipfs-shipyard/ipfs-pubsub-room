'use strict'

module.exports = (peer) => {
  if (peer.id && (typeof peer.id.toB58String === 'function')) {
    peer = peer.id
  }
  return peer.toB58String()
}
