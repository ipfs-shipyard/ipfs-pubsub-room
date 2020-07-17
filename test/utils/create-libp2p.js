'use strict'

const Libp2p = require('libp2p')
const TCP = require('libp2p-tcp')
const Multiplex = require('libp2p-mplex')
const NOISE = require('libp2p-noise')
const SECIO = require('libp2p-secio')
const GossipSub = require('libp2p-gossipsub')
const PeerId = require('peer-id')

const RELAY_MULTIADDR = '/ip4/0.0.0.0/tcp/0'

const config = async () => {
  return {
    peerId: await PeerId.create(),
    addresses: {
      listen: [RELAY_MULTIADDR]
    },
    dialer: {
      maxParallelDials: 150, // 150 total parallel multiaddr dials
      maxDialsPerPeer: 4, // Allow 4 multiaddrs to be dialed per peer in parallel
      dialTimeout: 10e3 // 10 second dial timeout per peer dial
    },
    modules: {
      transport: [
        TCP
      ],
      streamMuxer: [
        Multiplex
      ],
      connEncryption: [
        NOISE, SECIO
      ],
      pubsub: GossipSub
    },
    config: {
      peerDiscovery: {
        autoDial: false,
        bootstrap: {
          enabled: false
        }
      },
      pubsub: {
        enabled: true,
        emitSelf: true
      }
    }
  }
}

module.exports = async (otherNode) => {
  const node = await Libp2p.create(await config())

  await node.start()
  console.log('libp2p has started')

  // both nodes created, get them to dial each other via the relay
  if (otherNode) {
    const otherNodeId = otherNode.peerId
    const nodeId = node.peerId

    node.peerStore.addressBook.set(otherNode.peerId, otherNode.multiaddrs)
    otherNode.peerStore.addressBook.set(node.peerId, node.multiaddrs)
    
    await node.dial(otherNodeId)
    await otherNode.dial(nodeId)
  }

  return node
}

module.exports.config = config
