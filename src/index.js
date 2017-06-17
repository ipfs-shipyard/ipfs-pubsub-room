'use strict'

const diff = require('hyperdiff')
const EventEmitter = require('events')
const timers = require('timers')
const clone = require('lodash.clonedeep')

const DEFAULT_OPTIONS = {
  pollInterval: 1000
}

module.exports = (ipfs, topic, options) => {
  return new PubSubRoom(ipfs, topic, options)
}

class PubSubRoom extends EventEmitter {
  constructor (ipfs, topic, options) {
    super()
    this._ipfs = ipfs
    this._topic = topic
    this._options = Object.assign({}, clone(DEFAULT_OPTIONS), clone(options))
    this._peers = []

    if (!this._ipfs.pubsub) {
      throw new Error('This IPFS node does not have pubsub.')
    }

    if (this._ipfs.isOnline()) {
      this._start()
    }
    this._ipfs.on('ready', this._start.bind(this))
    this._ipfs.on('stop', this.stop.bind(this))
  }

  getPeers () {
    return this._peers.slice(0)
  }

  hasPeer (peer) {
    return this._peers.indexOf(peer) >= 0
  }

  stop () {
    timers.clearInterval()
    this.emit('stop')
  }

  getPeerAddresses (peerId, callback) {
    this._ipfs.swarm.peers((err, peersAddresses) => {
      if (err) {
        callback(err)
        return // early
      }

      callback(
        null,
        peersAddresses
          .filter(
            (peerAddress) => peerAddress.peer.id.toB58String() === peerId)
          .map(peerAddress => peerAddress.addr)
      )
    })
  }

  _start () {
    this._interval = timers.setInterval(
      this._pollPeers.bind(this),
      this._options.pollInterval)

    const listener = this._onMessage.bind(this)
    this._ipfs.pubsub.subscribe(this._topic, listener, (err) => {
      if (err) {
        this.emit('error', err)
      } else {
        this.emit('subscribed', this._topic)
      }
    })

    this.once('stop', () => {
      this._ipfs.pubsub.unsubscribe(this._topic, listener)
    })
  }

  _pollPeers () {
    this._ipfs.pubsub.peers(this._topic, (err, _newPeers) => {
      if (err) {
        this.emit('error', err)
        return // early
      }

      const newPeers = _newPeers.sort()

      if (this._emitChanges(newPeers)) {
        this._peers = newPeers
      }
    })
  }

  _emitChanges (newPeers) {
    const differences = diff(this._peers, newPeers)

    differences.added.forEach((addedPeer) => this.emit('peer joined', addedPeer))
    differences.removed.forEach((removedPeer) => this.emit('peer left', removedPeer))

    return differences.added.length > 0 || differences.removed.length > 0
  }

  _onMessage (message) {
    this.emit('message', message)
  }
}
