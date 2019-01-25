'use strict'

const EventEmitter = require('events')
const pull = require('pull-stream')
const Pushable = require('pull-pushable')

const PROTOCOL = require('./protocol')
const encoding = require('./encoding')
const getPeerId = require('./peer-id')
const libp2p = require('./libp2p')

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
    } else {
      this.once('connect', () => this.push(message))
      if (!this._connecting) {
        this._getConnection()
      }
    }
  }

  stop () {
    if (this._connection) {
      this._connection.end()
    }
  }

  _getConnection () {
    this._connecting = true
    this._getPeerAddresses(this._id, (err, peerAddresses) => {
      if (err) {
        this.emit('error', err)
        return // early
      }

      if (!peerAddresses.length) {
        this.emit('disconnect')
        return // early
      }

      libp2p(this._ipfs).dialProtocol(peerAddresses[0], PROTOCOL, (err, conn) => {
        if (err) {
          this.emit('disconnect')
          return // early
        }
        this._connecting = false
        const pushable = Pushable()
        this._connection = pushable
        pull(
          pushable,
          conn,
          pull.onEnd(() => {
            delete this._connection
            this.emit('disconnect')
          })
        )
        this.emit('connect', pushable)
      })
    })
  }

  _getPeerAddresses (peerId, callback) {
    this._ipfs.swarm.peers((err, peersAddresses) => {
      if (err) {
        callback(err)
        return // early
      }

      callback(
        null,
        peersAddresses
          .filter((peerAddress) => getPeerId(peerAddress.peer) === peerId)
          .map(peerAddress => peerAddress.peer))
    })
  }
}
