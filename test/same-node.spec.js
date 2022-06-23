/* eslint-env mocha */
/* eslint max-nested-callbacks: ["error", 5] */

import { expect } from 'aegir/chai'
import PubSubRoom from '../src/index.js'
import createLibp2p from './utils/create-libp2p.js'
import { toString as uint8ArrayToString } from 'uint8arrays/to-string'

const topic = 'pubsub-same-node-test-' + Date.now() + '-' + Math.random()

describe('same node', function () {
  this.timeout(30000)
  let node
  const rooms = []

  before(async () => {
    node = await createLibp2p()
  })

  before(() => {
    for (let i = 0; i < 2; i++) {
      rooms.push(new PubSubRoom(node, topic))
    }
  })

  after(() => {
    return Promise.all(
      rooms.map(room => room.leave())
    )
  })

  after(() => node.stop())

  it('mirrors broadcast', (done) => {
    rooms[0].once('message', (message) => {
      expect(uint8ArrayToString(message.data)).to.equal('message 1')
      rooms[0].once('message', (message) => {
        expect(uint8ArrayToString(message.data)).to.equal('message 2')
        done()
      })
    })
    rooms[1].broadcast('message 1')
    rooms[1].broadcast('message 2')
  })
})
