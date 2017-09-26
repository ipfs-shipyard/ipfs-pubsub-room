'use strict'

const EventEmitter = require('events')
const pull = require('pull-stream')
const Pushable = require('pull-pushable')

const PROTOCOL = require('./protocol')
const encoding = require('./encoding')

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
      if (!this._connecting) {
        this._getConnection()
      }
      this.once('connect', () => {
        this.push(message)
      })
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
        this.emit('error', new Error('could not connect to ' + this._id))
        return // early
      }

      this._ipfs._libp2pNode.dial(peerAddresses[0], PROTOCOL, (err, conn) => {
        if (err) {
          this.emit('error', err)
          return // early
        }
        this._connecting = false
        const pushable = Pushable()
        this._connection = pushable
        pull(
          pushable,
          conn,
          pull.onEnd((err) => {
            delete this._connection
            if (err) {
              this.emit('error', err)
            }
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
          .filter((peerAddress) => peerAddress.peer.id.toB58String() === peerId)
          .map(peerAddress => peerAddress.peer))
    })
  }
}
