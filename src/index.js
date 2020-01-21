'use strict'

const diff = require('hyperdiff')
const EventEmitter = require('events')
const clone = require('lodash.clonedeep')
const CID = require('cids')

const PROTOCOL = require('./protocol')
const Connection = require('./connection')
const encoding = require('./encoding')
const directConnection = require('./direct-connection-handler')

const DEFAULT_OPTIONS = {
  pollInterval: 1000
}

let index = 0

class PubSubRoom extends EventEmitter {
  constructor (ipfs, topic, options) {
    super()
    this._ipfs = ipfs
    this._topic = topic
    this._options = Object.assign({}, clone(DEFAULT_OPTIONS), clone(options))
    this._peers = []
    this._connections = {}

    this._handleDirectMessage = this._handleDirectMessage.bind(this)
    this._handleMessage = this._onMessage.bind(this)

    if (!this._ipfs.pubsub) {
      throw new Error('This IPFS node does not have pubsub.')
    }

    if (!this._ipfs.libp2p) {
      throw new Error('This IPFS node does not have libp2p.')
    }

    this._interval = setInterval(
      this._pollPeers.bind(this),
      this._options.pollInterval
    )

    this._ipfs.libp2p.handle(PROTOCOL, directConnection.handler)
    directConnection.emitter.on(this._topic, this._handleDirectMessage)

    this._ipfs.pubsub.subscribe(this._topic, this._handleMessage)

    this._idx = index++
  }

  getPeers () {
    return this._peers.slice(0)
  }

  hasPeer (peer) {
    return Boolean(this._peers.find(p => p.toString() === peer.toString()))
  }

  async leave () {
    clearInterval(this._interval)
    Object.keys(this._connections).forEach((peer) => {
      this._connections[peer].stop()
    })
    directConnection.emitter.removeListener(this._topic, this._handleDirectMessage)
    this._ipfs.libp2p.unhandle(PROTOCOL, directConnection.handler)
    await this._ipfs.pubsub.unsubscribe(this._topic, this._handleMessage)
  }

  async broadcast (_message) {
    const message = encoding(_message)

    await this._ipfs.pubsub.publish(this._topic, message)
  }

  async sendTo (peer, message) {
    let conn = this._connections[peer]
    if (!conn) {
      conn = new Connection(peer, this._ipfs, this)
      conn.on('error', (err) => this.emit('error', err))
      this._connections[peer] = conn

      conn.once('disconnect', () => {
        delete this._connections[peer]
        this._peers = this._peers.filter((p) => p.toString() !== peer.toString())
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
      from: await this._ourId(),
      data: Buffer.from(message).toString('hex'),
      seqno: seqno.toString('hex'),
      topicIDs: [this._topic],
      topicCIDs: [this._topic]
    }

    conn.push(Buffer.from(JSON.stringify(msg)))
  }

  async _pollPeers () {
    const newPeers = (await this._ipfs.pubsub.peers(this._topic))
      .map(id => new CID(1, 'libp2p-key', new CID(id).buffer))

    if (this._emitChanges(newPeers)) {
      this._peers = newPeers
    }
  }

  _emitChanges (newPeers) {
    const differences = diff(this._peers, newPeers)

    differences.added.forEach((peer) => this.emit('peer joined', peer))
    differences.removed.forEach((peer) => this.emit('peer left', peer))

    return differences.added.length > 0 || differences.removed.length > 0
  }

  _onMessage (message) {
    this.emit('message', {
      ...message,
      from: new CID(1, 'libp2p-key', new CID(message.from).buffer)
    })
  }

  async _handleDirectMessage (message) {
    if (message.to.toString() === (await this._ourId()).toString()) {
      const m = Object.assign({}, message)
      delete m.to
      this.emit('message', m)
    }
  }

  async _ourId () {
    if (!this._id) {
      this._id = (await this._ipfs.id()).id
    }

    return this._id
  }
}

module.exports = PubSubRoom
