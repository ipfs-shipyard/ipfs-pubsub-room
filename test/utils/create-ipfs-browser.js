'use strict'

const IPFS = require('ipfs')
const clone = require('lodash.clonedeep')
const RELAY_MULTIADDR = '/ip4/127.0.0.1/tcp/24642/ws'

const ipfsOptions = {
  relay: {
    enabled: true, // enable relay dialer/listener (STOP)
    hop: {
      enabled: true // make this node a relay (HOP)
    }
  },
  config: {
    Bootstrap: [
      '/ip4/127.0.0.1/tcp/24642/ws'
    ]
  }
}

module.exports = async (repo, otherNode) => {
  const options = Object.assign({}, clone(ipfsOptions), {
    repo
  })

  const ipfs = await IPFS.create(options)

  // connect to relay peer
  await ipfs.swarm.connect(RELAY_MULTIADDR)

  // both nodes created, get them to dial each other via the relay
  if (otherNode) {
    const peers = await ipfs.swarm.peers()
    const nodeId = await ipfs.id()
    const otherNodeId = await otherNode.id()

    await ipfs.swarm.connect(`${RELAY_MULTIADDR}/p2p/${peers[0].peer.toString()}/p2p-circuit/p2p/${otherNodeId.id.toString()}`)
    await otherNode.swarm.connect(`${RELAY_MULTIADDR}/p2p/${peers[0].peer.toString()}/p2p-circuit/p2p/${nodeId.id.toString()}`)
  }

  return ipfs
}
