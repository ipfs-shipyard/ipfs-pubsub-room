import { createLibp2p } from 'libp2p'
import { config } from './test/utils/create-libp2p.js'

export default {
  test: {
    async before () {
      const defaultConfig = config()
      const relay = await createLibp2p({
        ...defaultConfig,
        relay: {
          enabled: true,
          hop: {
            enabled: true,
            active: true
          }
        },
        addresses: {
          listen: [
            '/ip4/127.0.0.1/tcp/24642/ws'
          ]
        }
      })

      await relay.start()

      const addrs = relay.getMultiaddrs()

      return {
        relay,
        env: {
          RELAY_ADDRESS: addrs[0]
        }
      }
    },
    async after (_, before) {
      await before.relay.stop()
    }
  }
}
