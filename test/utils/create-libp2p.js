'use strict'

const Libp2p = require('libp2p')
const WS = require('libp2p-websockets')
const Multiplex = require('libp2p-mplex')
const SECIO = require('libp2p-secio')
const GossipSub = require('libp2p-gossipsub')
const PeerInfo = require('peer-info')

const RELAY_MULTIADDR = '/ip4/127.0.0.1/tcp/24642/ws'

const config = async () => {
  return {
    peerInfo: await PeerInfo.create(),
    dialer: {
      maxParallelDials: 150, // 150 total parallel multiaddr dials
      maxDialsPerPeer: 4, // Allow 4 multiaddrs to be dialed per peer in parallel
      dialTimeout: 10e3 // 10 second dial timeout per peer dial
    },
    modules: {
      transport: [
        WS
      ],
      streamMuxer: [
        Multiplex
      ],
      connEncryption: [
        SECIO
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
  const node = new Libp2p(await config())

  await node.start()

  // connect to relay peer
  await node.dial(RELAY_MULTIADDR)

  // both nodes created, get them to dial each other via the relay
  if (otherNode) {
    const relayId = node.connections.keys().next().value
    const otherNodeId = otherNode.peerInfo.id.toB58String()
    const nodeId = node.peerInfo.id.toB58String()

    await node.dial(`${RELAY_MULTIADDR}/p2p/${relayId}/p2p-circuit/p2p/${otherNodeId}`)
    await otherNode.dial(`${RELAY_MULTIADDR}/p2p/${relayId}/p2p-circuit/p2p/${nodeId}`)
  }

  return node
}

module.exports.config = config
