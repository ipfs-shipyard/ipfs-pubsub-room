'use strict'

const { createFactory } = require('ipfsd-ctl')
const df = createFactory({
  ipfsModule: {
    path: require.resolve('ipfs'),
    ref: require('ipfs')
  }
})

let ipfsd

module.exports = {
  hooks: {
    browser: {
      pre: async () => {
        ipfsd = await df.spawn({
          type: 'proc',
          test: true,
          ipfsOptions: {
            relay: {
              enabled: true,
              hop: {
                enabled: true
              }
            },
            config: {
              Addresses: {
                Swarm: [
                  '/ip4/127.0.0.1/tcp/24642/ws'
                ]
              }
            }
          }
        })
      },
      post: async () => {
        await ipfsd.stop()
      }
    }
  }
}
