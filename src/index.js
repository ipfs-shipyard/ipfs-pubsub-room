'use strict'

const diff = require('hyperdiff')
const EventEmitter = require('events')
const timers = require('timers')
const clone = require('lodash.clonedeep')

const PROTOCOL = require('./protocol')
const Connection = require('./connection')
const encoding = require('./encoding')
const directConnection = require('./direct-connection-handler')
const libp2p = require('./libp2p')

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
    this._connections = {}

    this._handleDirectMessage = this._handleDirectMessage.bind(this)

    if (!this._ipfs.pubsub) {
      throw new Error('This IPFS node does not have pubsub.')
    }

    if (this._ipfs.isOnline()) {
      this._start()
    } else {
      this._ipfs.on('ready', this._start.bind(this))
    }

    this._ipfs.on('stop', this.leave.bind(this))
  }

  getPeers () {
    return this._peers.slice(0)
  }

  hasPeer (peer) {
    return this._peers.indexOf(peer) >= 0
  }

  leave () {
    return new Promise((resolve, reject) => {
      timers.clearInterval(this._interval)
      Object.keys(this._connections).forEach((peer) => {
        this._connections[peer].stop()
      })
      directConnection.emitter.removeListener(this._topic, this._handleDirectMessage)
      this.once('stopped', () => resolve())
      this.emit('stopping')
    })
  }

  broadcast (_message) {
    let message = encoding(_message)

    this._ipfs.pubsub.publish(this._topic, message, (err) => {
      if (err) {
        this.emit('error', err)
      }
    })
  }

  sendTo (peer, message) {
    let conn = this._connections[peer]
    if (!conn) {
      conn = new Connection(peer, this._ipfs, this)
      conn.on('error', (err) => this.emit('error', err))
      this._connections[peer] = conn

      conn.once('disconnect', () => {
        delete this._connections[peer]
        this._peers = this._peers.filter((p) => p !== peer)
        this.emit('peer left', peer)
      })
    }

    // We should use the same sequence number generation as js-libp2p-floosub does:
    // const seqno = Buffer.from(utils.randomSeqno())

    // Until we figure out a good way to bring in the js-libp2p-floosub's randomSeqno
    // generator, let's use 0 as the sequence number for all private messages
    // const seqno = Buffer.from([0])
    const seqno = Buffer.from([0])

    const msg = {
      to: peer,
      from: this._ipfs._peerInfo.id.toB58String(),
      data: Buffer.from(message).toString('hex'),
      seqno: seqno.toString('hex'),
      topicIDs: [ this._topic ],
      topicCIDs: [ this._topic ]
    }

    conn.push(Buffer.from(JSON.stringify(msg)))
  }

  _start () {
    this._interval = timers.setInterval(
      this._pollPeers.bind(this),
      this._options.pollInterval)

    const listener = this._onMessage.bind(this)
    this._ipfs.pubsub.subscribe(this._topic, listener, {}, (err) => {
      if (err) {
        this.emit('error', err)
      } else {
        this.emit('subscribed', this._topic)
      }
    })

    this.once('stopping', () => {
      this._ipfs.pubsub.unsubscribe(this._topic, listener, (err) => {
        if (err) {
          this.emit('error', err)
        } else {
          this.emit('stopped')
        }
      })
    })

    libp2p(this._ipfs).handle(PROTOCOL, directConnection.handler)

    directConnection.emitter.on(this._topic, this._handleDirectMessage)
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

  _handleDirectMessage (message) {
    if (message.to === this._ipfs._peerInfo.id.toB58String()) {
      const m = Object.assign({}, message)
      delete m.to
      this.emit('message', m)
    }
  }
}
