'use strict'

const Libp2p = require('libp2p')
const PeerId = require('peer-id')
const { config } = require('./test/utils/create-libp2p')

let relay

module.exports = {
  hooks: {
    pre: async () => {
      const peerId = await PeerId.create()

      const defaultConfig = await config()

      relay = new Libp2p({
        ...defaultConfig,
        peerId,
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
