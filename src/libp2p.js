'use strict'

module.exports = (ipfs) => {
  return ipfs._libp2pNode || ipfs.libp2p
}
