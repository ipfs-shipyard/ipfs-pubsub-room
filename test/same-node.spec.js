/* eslint-env mocha */
/* eslint max-nested-callbacks: ["error", 5] */
'use strict'

const chai = require('chai')
chai.use(require('dirty-chai'))
const expect = chai.expect

const IPFS = require('ipfs')
const clone = require('lodash.clonedeep')

const Room = require('../')
const createRepo = require('./utils/create-repo-node')

const topic = 'pubsub-same-node-test-' + Date.now() + '-' + Math.random()

const ipfsOptions = {
  EXPERIMENTAL: {
    pubsub: true
  },
  config: {
    Addresses: {
      Swarm: [
        '/dns4/ws-star.discovery.libp2p.io/tcp/443/wss/p2p-websocket-star'
      ]
    }
  }
}

describe('same node', function () {
  this.timeout(30000)
  let repo
  let node
  let rooms = []

  before((done) => {
    repo = createRepo()
    const options = Object.assign({}, clone(ipfsOptions), {
      repo: repo
    })
    node = new IPFS(options)
    node.once('ready', () => {
      done()
    })
  })

  before(() => {
    for (let i = 0; i < 2; i++) {
      rooms.push(Room(node, topic))
    }
  })

  after(() => rooms.forEach((room) => room.leave()))

  after((done) => node.stop(done))

  after((done) => repo.teardown(done))

  it('mirrors broadcast', (done) => {
    rooms[0].once('message', (message) => {
      expect(message.data.toString()).to.equal('message 1')
      rooms[0].once('message', (message) => {
        expect(message.data.toString()).to.equal('message 2')
        done()
      })
    })
    rooms[1].broadcast('message 1')
    rooms[1].broadcast('message 2')
  })
})
