/* eslint-env mocha */
/* eslint max-nested-callbacks: ["error", 5] */

import { expect } from 'aegir/chai'
import { toString as uint8ArrayToString } from 'uint8arrays/to-string'
import delay from 'delay'
import PubSubRoom from '../src/index.js'
import createLibp2p from './utils/create-libp2p.js'

const topic = 'pubsub-room-concurrency-test-' + Date.now() + '-' + Math.random()

describe('concurrent rooms', function () {
  this.timeout(30000)
  let node1, node2
  let id1, id2
  let room1A, room1B, room2A, room2B
  const topicA = topic + '-A'
  const topicB = topic + '-B'

  before(async () => {
    node1 = await createLibp2p()
    id1 = node1.peerId

    node2 = await createLibp2p(node1)
    id2 = node2.peerId
  })

  after(() => {
    return Promise.all([
      room1A && room1A.leave(),
      room1B && room1B.leave(),
      room2A && room2A.leave(),
      room2B && room2B.leave()
    ])
  })

  after(() => {
    return Promise.all([
      node1 && node1.stop(),
      node2 && node2.stop()
    ])
  })

  it('can create a room, and they find each other', async () => {
    room1A = new PubSubRoom(node1, topicA)
    room2A = new PubSubRoom(node2, topicA)
    room1B = new PubSubRoom(node1, topicB)
    room2B = new PubSubRoom(node2, topicB)

    const roomNodes = [
      [room1A, id2],
      [room2A, id1],
      [room1B, id2],
      [room2A, id1]
    ]

    await Promise.all(
      roomNodes.map(async (roomNode) => {
        const room = roomNode[0]
        const waitingFor = roomNode[1]

        await new Promise((resolve) => {
          room.once('peer joined', (peer) => {
            expect(peer.toString()).to.equal(waitingFor.toString())
            resolve()
          })
        })
      })
    )
  })

  it('has peer', (done) => {
    expect(room1A.getPeers().map(p => p.toString())).to.deep.equal([id2.toString()])
    expect(room1B.getPeers().map(p => p.toString())).to.deep.equal([id2.toString()])
    expect(room2A.getPeers().map(p => p.toString())).to.deep.equal([id1.toString()])
    expect(room2B.getPeers().map(p => p.toString())).to.deep.equal([id1.toString()])
    done()
  })

  it('can broadcast', (done) => {
    let gotMessage = false
    const crash = Crash('no broadcast message should leak to room B')
    room1B.on('message', crash)
    room1A.once('message', (message) => {
      if (gotMessage) {
        throw new Error('double message')
      }
      gotMessage = true
      expect(message.from.toString()).to.equal(id2.toString())
      expect(uint8ArrayToString(message.data)).to.equal('message 1')

      room1B.removeListener('message', crash)
      done()
    })
    room2A.broadcast('message 1')
  })

  it('can send private message', (done) => {
    const crash = Crash('no private message should leak to room B')

    room2B.on('message', crash)
    room2A.once('message', (message) => {
      expect(message.from.toString()).to.equal(id1.toString())
      expect(message.seqno).to.equal(0n)
      expect(message.topic).to.deep.equal(topicA)
      expect(uint8ArrayToString(message.data)).to.equal('message 2')
      room2B.removeListener('message', crash)
      done()
    })
    room1A.sendTo(id2, 'message 2')
  })

  it('can leave room', (done) => {
    room1A.once('peer left', (peer) => {
      expect(peer.toString()).to.equal(id2.toString())
      done()
    })
    room2A.leave()
  })

  it('after leaving, it does not receive more messages', async () => {
    room2A.on('message', Crash('should not receive this'))
    await room2A.leave()
    room1A.broadcast('message 3')
    await delay(3000)
  })
})

function Crash (message) {
  return function () {
    throw new Error(message)
  }
}
