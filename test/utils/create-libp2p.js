import { createLibp2p } from 'libp2p'
import { WebSockets } from '@libp2p/websockets'
import * as WebSocketsFilters from '@libp2p/websockets/filters'
import { Mplex } from '@libp2p/mplex'
import { Plaintext } from 'libp2p/insecure'
import { GossipSub } from '@chainsafe/libp2p-gossipsub'
import { multiaddr } from '@multiformats/multiaddr'

export const config = () => {
  return {
    transports: [
      new WebSockets({
        filter: WebSocketsFilters.all
      })
    ],
    streamMuxers: [
      new Mplex()
    ],
    connectionEncryption: [
      new Plaintext()
    ],
    pubsub: new GossipSub({
      emitSelf: true
    }),
    nat: {
      enabled: false
    }
  }
}

export default async (otherNode) => {
  const node = await createLibp2p(config())

  await node.start()

  // connect to relay peer
  await node.dial(multiaddr(process.env.RELAY_ADDRESS))

  // both nodes created, get them to dial each other via the relay
  if (otherNode) {
    await node.dial(multiaddr(`${process.env.RELAY_ADDRESS}/p2p-circuit/p2p/${otherNode.peerId}`))
    await otherNode.dial(multiaddr(`${process.env.RELAY_ADDRESS}/p2p-circuit/p2p/${node.peerId}`))
  }

  return node
}
