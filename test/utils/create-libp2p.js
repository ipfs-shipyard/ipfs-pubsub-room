'use strict'

const Libp2p = require('libp2p')
const WS = require('libp2p-websockets')
const Multiplex = require('libp2p-mplex')
const SECIO = require('libp2p-secio')
const GossipSub = require('libp2p-gossipsub')
const PeerId = require('peer-id')
const { multiaddr } = require('multiaddr')

const RELAY_MULTIADDR = '/ip4/127.0.0.1/tcp/24642/ws'
const RELAY_PEER_ID_JSON = {
  id: 'QmQLNqWfXdTAEPsCWtiaVhDCCFfsYian7YLryRdQn3fgL4',
  privKey: 'CAASqAkwggSkAgEAAoIBAQDVCnVIHt/xx3LlS0bHUlS6A1oxuqfwrzCSNrr0T68RM1i/2zc1Pl6dMLdhpzIrMHrt6J4nMA2nzC71vHNvymQeLWvKmAWTEcKbGR8lQGHibBMP/1vwOwFlKxy3JzaqDS8hP6qTnMgGpMJosiroitTNHAJg2PCQM0zX+Q8ehsiwhoJ5IaIoCzutyo7S5X7uubOjUMj+tAVuX34/lz8ynQfnfFeS6GuCddsljg/RZ3c+wS+EPwsNd0VJjm3L5M9b+Ofh8IW5FI/MMmHg2+dpHJnZv9QCtclvCZJj0xUKpxtluM5NHd64h+fBQsmpB75b2eUkB3RUNLy/ngC50NbAIRN1AgMBAAECggEBAJW/HiUtnpgia76EpSGh23BMvu9JlpZ1bhy4X70u7Y2XnABvpGTGjFbNUXlQvtDg6OelpNVCz7ZsrW2Jo1Km3qzfnG7xYKm5yCKhC+VxVdyDvvp1sjgwIZDtNuf+pkvtrH0gdVQA1hDlasmQwtxmCaKK15kfpCiYBqGgrWH1t8dr3H4Vk2BUkQeryQ1kmRZ3fUJw+VNiB7yhmw+tx5ytFB3OMNxvUPylHM07s8VjpZ7B8Xde3jOlJYJFBQ7k1rkfuULtc5XD+7DrsF0DutN7X3N1TZf2iBYGwttN6CfHC8yRxwIgWzli53ldUV1YhtBB8MgCWUMbttfmoe9Fo9yMNoECgYEA8PTwPXwljlx4eAzr8FZD8HifXXTYcuVhpepFx5jlMwJ1sTYr2nIfaEf136iweYIv6A/5+7/S8yFmdlaf3Ito9m/6qXGUD8I5h90YSUyeBJy1IEPg1dqM+nIufMh9Oo++VPs/xnUEbcpCVfMUK4Gr1l/iLes70nEFjcI9VZVvZdECgYEA4ldbUfGvc/cwUbIgVTHFIeg0czd1XlOic8ur9x1MdhVIi0AjVZzV223E0X2qg90uCV9Ztn7kz9e9Z5e2tRidcfJ+1/t7M5l/NSCbD85H3HSZVBklwOft968KauboLtE2cFyve/ZM7s9aG8fEwi88IktsxHk9Dvb4x35JQOQBaGUCgYEAhPsZL0W50GS2U8MF36EsY6Wehkx7PIXdq1ys4ChArjM4UvILp8Z+EOZOCv6lTpoL6G4Qz+ChAm+3ha3vEh+acQ+B7kvxo/TUHWhnA+UV/IOj7senaT7xuTKU92cKvewg5fO30cY5CIKss5Sw2AX7mRdX03HUlSKtJvxBL1+GmFECgYADYZCwqa6YSeID5mhLPYIXXpOiAPsU3KT5m9pGx75DqU+7HMsqVTxwmbQt+PWaIKy2YSFC86RRYoSmzoJhNCvt7tRsP4p4m9tlnMYUN12lcmxz8Cg7OHu6jnfWXvqq8F8i0I+ih2xgyOIsthA/YltAm+XVDYaW+aN/v2gyuvU2bQKBgH2wWDWTQEJ4eX9ZwDmzCWKZlS6Hgb7bxxxE6g9asE6t0GwjcaMsLL4H7NajuEmxYWmDOVcGN04n/9NbTwZ+WQeTCLUGVLZxRo7bfyNVrbUoY21X7FrMptwX2GXg4U/JmkOYXN4xhgHXbzZVZwCiIjuXi9h/lJ4s+djses5P5T32',
  pubKey: 'CAASpgIwggEiMA0GCSqGSIb3DQEBAQUAA4IBDwAwggEKAoIBAQDVCnVIHt/xx3LlS0bHUlS6A1oxuqfwrzCSNrr0T68RM1i/2zc1Pl6dMLdhpzIrMHrt6J4nMA2nzC71vHNvymQeLWvKmAWTEcKbGR8lQGHibBMP/1vwOwFlKxy3JzaqDS8hP6qTnMgGpMJosiroitTNHAJg2PCQM0zX+Q8ehsiwhoJ5IaIoCzutyo7S5X7uubOjUMj+tAVuX34/lz8ynQfnfFeS6GuCddsljg/RZ3c+wS+EPwsNd0VJjm3L5M9b+Ofh8IW5FI/MMmHg2+dpHJnZv9QCtclvCZJj0xUKpxtluM5NHd64h+fBQsmpB75b2eUkB3RUNLy/ngC50NbAIRN1AgMBAAE='
}

const config = async (isRelay) => {
  return {
    peerId: isRelay ? await PeerId.createFromJSON(RELAY_PEER_ID_JSON) : await PeerId.create(),
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
  const relayPeerId = await PeerId.createFromJSON(RELAY_PEER_ID_JSON)
  node.peerStore.addressBook.add(relayPeerId, [multiaddr(RELAY_MULTIADDR)])
  await node.dial(relayPeerId)

  // both nodes created, get them to dial each other via the relay
  if (otherNode) {
    const relayId = node.connections.keys().next().value
    const otherNodeId = otherNode.peerId.toB58String()
    const nodeId = node.peerId.toB58String()

    await node.dial(`${RELAY_MULTIADDR}/p2p/${relayId}/p2p-circuit/p2p/${otherNodeId}`)
    await otherNode.dial(`${RELAY_MULTIADDR}/p2p/${relayId}/p2p-circuit/p2p/${nodeId}`)
  }

  return node
}

module.exports.config = config
