'use strict'

const EventEmitter = require('events')
const pipe = require('it-pipe')
const CID = require('cids')

const PROTOCOL = require('./protocol')
const encoding = require('./encoding')
const getPeerId = require('./peer-id')

module.exports = class Connection extends EventEmitter {
  constructor (id, ipfs, room) {
    super()
    this._id = id
    this._ipfs = ipfs
    this._room = room
    this._connection = null
    this._connecting = false
  }

  push (message) {
    if (this._connection) {
      this._connection.push(encoding(message))

      return
    }

    this.once('connect', () => {
      this.push(message)
    })

    if (!this._connecting) {
      this._connect()
    }
  }

  stop () {
    if (this._connection) {
      this._connection.end()
    }
  }

  async _connect () {
    this._connecting = true
    const peerAddresses = await this._getPeerAddresses(this._id)

    if (!peerAddresses.length) {
      this.emit('disconnect')
      return // early
    }

    const peerId = new CID(peerAddresses[0].multihash)
    const peerInfo = this._ipfs.libp2p.peerStore.get(peerId.toString('base58btc'))
    const { stream } = await this._ipfs.libp2p.dialProtocol(peerInfo, PROTOCOL)
    this._connection = new FiFoMessageQueue()

    pipe(this._connection, stream, async (source) => {
      this.emit('connect', this._connection)

      for await (const message of source) {
        this.emit('message', message)
      }
    })
      .then(() => {
        this.emit('disconnect')
      }, (err) => {
        this.emit('error', err)
      })
  }

  async _getPeerAddresses (peerId) {
    const peersAddresses = await this._ipfs.swarm.peers()

    return peersAddresses
      .filter((peerAddress) => getPeerId(peerAddress.peer) === peerId.toString())
      .map(peerAddress => peerAddress.peer)
  }
}

class FiFoMessageQueue {
  constructor () {
    this._queue = []
  }

  [Symbol.asyncIterator] () {
    return this
  }

  push (message) {
    if (this._ended) {
      throw new Error('Message queue ended')
    }

    if (this._resolve) {
      return this._resolve({
        done: false,
        value: message
      })
    }

    this._queue.push(message)
  }

  end () {
    this._ended = true
    if (this._resolve) {
      this._resolve({
        done: true
      })
    }
  }

  next () {
    if (this._ended) {
      return {
        done: true
      }
    }

    if (this._queue.length) {
      return {
        done: false,
        value: this._queue.shift()
      }
    }

    return new Promise((resolve) => {
      this._resolve = resolve
    })
  }
}
