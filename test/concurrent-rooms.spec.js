/* eslint-env mocha */
/* eslint max-nested-callbacks: ["error", 5] */
'use strict'

const chai = require('chai')
chai.use(require('dirty-chai'))
const expect = chai.expect

const IPFS = require('ipfs')
const each = require('async/each')
const clone = require('lodash.clonedeep')

const Room = require('../')
const createRepo = require('./utils/create-repo-node')

const topic = 'pubsub-room-concurrency-test-' + Date.now() + '-' + Math.random()

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

describe('concurrent rooms', function () {
  this.timeout(30000)
  const repos = []
  let node1, node2
  let id1, id2
  let room1A, room1B, room2A, room2B
  const topicA = topic + '-A'
  const topicB = topic + '-B'

  before((done) => {
    const repo = createRepo()
    repos.push(repo)
    const options = Object.assign({}, clone(ipfsOptions), {
      repo: repo
    })
    node1 = new IPFS(options)
    node1.once('ready', () => {
      node1.id((err, info) => {
        expect(err).to.not.exist()
        id1 = info.id
        done()
      })
    })
  })

  before((done) => {
    const repo = createRepo()
    repos.push(repo)
    const options = Object.assign({}, clone(ipfsOptions), {
      repo: repo
    })
    node2 = new IPFS(options)
    node2.once('ready', () => {
      node2.id((err, info) => {
        expect(err).to.not.exist()
        id2 = info.id
        done()
      })
    })
  })

  after((done) => each(repos, (repo, cb) => { repo.teardown(cb) }, done))

  it('can create a room, and they find each other', (done) => {
    room1A = Room(node1, topicA)
    room2A = Room(node2, topicA)
    room1B = Room(node1, topicB)
    room2B = Room(node2, topicB)
    room1A.on('warning', console.log)
    room2A.on('warning', console.log)
    room1B.on('warning', console.log)
    room2B.on('warning', console.log)

    const roomNodes = [
      [room1A, id2],
      [room2A, id1],
      [room1B, id2],
      [room2A, id1]
    ]

    each(roomNodes, (roomNode, cb) => {
      const room = roomNode[0]
      const waitingFor = roomNode[1]
      room.once('peer joined', (id) => {
        expect(id).to.equal(waitingFor)
        cb()
      })
    }, done)
  })

  it('has peer', (done) => {
    expect(room1A.getPeers()).to.deep.equal([id2])
    expect(room1B.getPeers()).to.deep.equal([id2])
    expect(room2A.getPeers()).to.deep.equal([id1])
    expect(room2B.getPeers()).to.deep.equal([id1])
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
      expect(message.from).to.equal(id2)
      expect(message.data.toString()).to.equal('message 1')

      room1B.removeListener('message', crash)
      done()
    })
    room2A.broadcast('message 1')
  })

  it('can send private message', (done) => {
    const crash = Crash('no private message should leak to room B')

    room2B.on('message', crash)
    room2A.once('message', (message) => {
      expect(message.from).to.equal(id1)
      expect(message.seqno.toString()).to.equal(Buffer.from([0]).toString())
      expect(message.topicIDs).to.deep.equal([topicA])
      expect(message.topicCIDs).to.deep.equal([topicA])
      expect(message.data.toString()).to.equal('message 2')
      room2B.removeListener('message', crash)
      done()
    })
    room1A.sendTo(id2, 'message 2')
  })

  it('can leave room', (done) => {
    room1A.once('peer left', (peer) => {
      expect(peer).to.equal(id2)
      done()
    })
    room2A.leave()
  })

  it('after leaving, it does not receive more messages', (done) => {
    room2A.on('message', Crash('should not receive this'))
    room2A.leave()
    room1A.broadcast('message 3')
    setTimeout(done, 3000)
  })
})

function Crash (message) {
  return function () {
    throw new Error(message)
  }
}
