'use strict'

const IPFS = require('ipfs')
const clone = require('lodash.clonedeep')

const ipfsOptions = {
  config: {
    Addresses: {
      Swarm: [
        '/ip4/0.0.0.0/tcp/0'
      ]
    },
    Bootstrap: []
  }
}

module.exports = (repo) => {
  const options = Object.assign({}, clone(ipfsOptions), {
    repo
  })

  return IPFS.create(options)
}
