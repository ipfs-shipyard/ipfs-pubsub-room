'use strict'

const Libp2p = require('libp2p')
const { config } = require('./test/utils/create-libp2p')

let relay

module.exports = {
  hooks: {
    pre: async () => {
      const defaultConfig = await config(true)

      relay = new Libp2p({
        ...defaultConfig,
        addresses: {
          listen: ['/ip4/127.0.0.1/tcp/24642/ws'],
        },
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
