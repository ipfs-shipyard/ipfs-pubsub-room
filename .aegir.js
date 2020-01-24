'use strict'

const Libp2p = require('libp2p')
const PeerInfo = require('peer-info')
const { config } = require('./test/utils/create-libp2p')

let relay

module.exports = {
  hooks: {
    pre: async () => {
      const peerInfo = await PeerInfo.create()
      peerInfo.multiaddrs.add('/ip4/127.0.0.1/tcp/24642/ws')

      const defaultConfig = await config()

      relay = new Libp2p({
        ...defaultConfig,
        peerInfo,
        config: {
          ...defaultConfig.config,
          relay: {
            enabled: true,
            hop: {
              enabled: true
            }
          }
        }
      })

      await relay.start()
    },
    post: async () => {
      await relay.stop()
    }
  }
}
