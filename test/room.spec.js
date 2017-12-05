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

const topicBase = 'pubsub-room-test-' + Date.now() + '-' + Math.random()

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

describe('room', function () {
  this.timeout(30000)
  const repos = []
  let node1, node2
  let id1, id2

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

  ;([1, 2].forEach((n) => {
    const topic = topicBase + '-' + n
    let room1, room2
    describe('topic ' + n, () => {
      it('can create a room, and they find each other', (done) => {
        room1 = Room(node1, topic)
        room2 = Room(node2, topic)
        room1.on('warning', console.log)
        room2.on('warning', console.log)

        let left = 2
        room1.once('peer joined', (id) => {
          expect(id).to.equal(id2)
          if (--left === 0) {
            done()
          }
        })
        room2.once('peer joined', (id) => {
          expect(id).to.equal(id1)
          if (--left === 0) {
            done()
          }
        })
      })

      it('has peer', (done) => {
        expect(room1.getPeers()).to.deep.equal([id2])
        expect(room2.getPeers()).to.deep.equal([id1])
        done()
      })

      it('can broadcast', (done) => {
        let gotMessage = false
        room1.on('message', (message) => {
          if (gotMessage) {
            throw new Error('double message:' + message.data.toString())
          }
          gotMessage = true
          expect(message.from).to.equal(id2)
          expect(message.data.toString()).to.equal('message 1')
          done()
        })
        room2.broadcast('message 1')
      })

      it('can send private message', (done) => {
        let gotMessage = false

        room2.on('message', (message) => {
          if (gotMessage) {
            throw new Error('double message')
          }
          gotMessage = true
          expect(message.from).to.equal(id1)
          expect(message.seqno.toString()).to.equal(Buffer.from([0]).toString())
          expect(message.topicIDs).to.deep.equal([topic])
          expect(message.topicCIDs).to.deep.equal([topic])
          expect(message.data.toString()).to.equal('message 2')
          done()
        })
        room1.sendTo(id2, 'message 2')
      })

      it('can leave room', (done) => {
        room1.once('peer left', (peer) => {
          expect(peer).to.equal(id2)
          done()
        })
        room2.leave()
      })
    })
  }))
})
