/* eslint-env mocha */
/* eslint max-nested-callbacks: ["error", 5] */

import { expect } from 'aegir/chai'
import { toString as uint8ArrayToString } from 'uint8arrays/to-string'
import PubSubRoom from '../src/index.js'
import createLibp2p from './utils/create-libp2p.js'

const topicBase = 'pubsub-room-test-' + Date.now() + '-' + Math.random()

describe('room', function () {
  this.timeout(30000)
  let node1, node2
  let id1, id2

  before(async () => {
    node1 = await createLibp2p()
    id1 = node1.peerId
  })

  before(async () => {
    node2 = await createLibp2p(node1)
    id2 = node2.peerId
  })

  const rooms = []

  ;([1, 2].forEach((n) => {
    const topic = topicBase + '-' + n

    after('after topic ' + n, () => {
      return Promise.all([
        rooms[n].a.leave(),
        rooms[n].b.leave()
      ])
    })

    describe('topic ' + n, () => {
      it('can create a room, and they find each other', (done) => {
        rooms[n] = {
          a: new PubSubRoom(node1, topic),
          b: new PubSubRoom(node2, topic)
        }

        let left = 2
        rooms[n].a.once('peer joined', (id) => {
          expect(id.toString()).to.deep.equal(id2.toString())
          if (--left === 0) {
            done()
          }
        })
        rooms[n].b.once('peer joined', (id) => {
          expect(id.toString()).to.deep.equal(id1.toString())
          if (--left === 0) {
            done()
          }
        })
      })

      it('has peer', (done) => {
        expect(rooms[n].a.getPeers().map(p => p.toString())).to.deep.equal([id2.toString()])
        expect(rooms[n].b.getPeers().map(p => p.toString())).to.deep.equal([id1.toString()])
        done()
      })

      it('can broadcast', (done) => {
        let gotMessage = false
        rooms[n].a.on('message', (message) => {
          if (gotMessage) {
            throw new Error('double message:' + uint8ArrayToString(message.data))
          }
          gotMessage = true
          expect(message.from.toString()).to.equal(id2.toString())
          expect(uint8ArrayToString(message.data)).to.equal('message 1')
          done()
        })
        rooms[n].b.broadcast('message 1')
      })

      it('can send private message', (done) => {
        let gotMessage = false

        rooms[n].b.on('message', (message) => {
          if (gotMessage) {
            throw new Error('double message')
          }
          gotMessage = true
          expect(message.from.toString()).to.equal(id1.toString())
          expect(message.seqno).to.equal(0n)
          expect(message.topic).to.equal(topic)
          expect(uint8ArrayToString(message.data)).to.equal('message 2')
          done()
        })
        rooms[n].a.sendTo(id2, 'message 2')
      })

      it('can leave room', (done) => {
        rooms[n].a.once('peer left', (peer) => {
          expect(peer.toString()).to.deep.equal(id2.toString())
          done()
        })
        rooms[n].b.leave()
      })
    })
  }))

  after(() => {
    return Promise.all([
      node1.stop(),
      node2.stop()
    ])
  })
})
