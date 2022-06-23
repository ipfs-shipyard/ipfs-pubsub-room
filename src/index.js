import diff from 'hyperdiff'
import EventEmitter from 'events'
import clone from 'lodash.clonedeep'
import Connection from './connection.js'
import encoding from './encoding.js'
import * as directConnection from './direct-connection-handler.js'
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string'
import { toString as uint8ArrayToString } from 'uint8arrays/to-string'

const DEFAULT_OPTIONS = {
  pollInterval: 1000
}

let index = 0

export default class PubSubRoom extends EventEmitter {
  constructor (libp2p, topic, options) {
    super()
    this._libp2p = libp2p.libp2p || libp2p
    this._topic = topic
    this._options = Object.assign({}, clone(DEFAULT_OPTIONS), clone(options))
    this._peers = []
    this._connections = {}

    this._handleDirectMessage = this._handleDirectMessage.bind(this)
    this._handleMessage = this._onMessage.bind(this)

    if (!this._libp2p.pubsub) {
      throw new Error('pubsub has not been configured')
    }

    this._interval = setInterval(
      this._pollPeers.bind(this),
      this._options.pollInterval
    )

    directConnection.handle(libp2p)
    directConnection.emitter.on(this._topic, this._handleDirectMessage)

    this._libp2p.pubsub.subscribe(this._topic)
    this._libp2p.pubsub.addEventListener('message', this._handleMessage)

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
    // directConnection.unhandle(this._libp2p)
    await this._libp2p.pubsub.unsubscribe(this._topic)
    this._libp2p.pubsub.removeEventListener('message', this._handleMessage)
  }

  async broadcast (_message) {
    const message = encoding(_message)
    await this._libp2p.pubsub.publish(this._topic, message)
  }

  sendTo (peer, message) {
    let conn = this._connections[peer]
    if (!conn) {
      conn = new Connection(peer, this._libp2p, this)
      conn.on('error', (err) => this.emit('error', err))
      this._connections[peer] = conn

      conn.once('disconnect', () => {
        delete this._connections[peer]
        this._peers = this._peers.filter((p) => p.toString() !== peer.toString())
        this.emit('peer left', peer)
      })
    }

    // We should use the same sequence number generation as js-libp2p-floosub does:
    // const seqno = Uint8Array.from(utils.randomSeqno())

    // Until we figure out a good way to bring in the js-libp2p-floosub's randomSeqno
    // generator, let's use 0 as the sequence number for all private messages
    const seqno = 0n

    const msg = {
      to: peer,
      from: this._libp2p.peerId.toString(),
      data: uint8ArrayToString(uint8ArrayFromString(message), 'hex'),
      seqno: seqno.toString(),
      topic: this._topic
    }

    conn.push(uint8ArrayFromString(JSON.stringify(msg)))
  }

  async _pollPeers () {
    const newPeers = (await this._libp2p.pubsub.getSubscribers(this._topic)).sort()

    if (this._emitChanges(newPeers)) {
      this._peers = newPeers
    }
  }

  _emitChanges (newPeers) {
    const differences = diff(this._peers.map(p => p.toString()), newPeers.map(p => p.toString()))

    differences.added.forEach((peer) => this.emit('peer joined', peer))
    differences.removed.forEach((peer) => this.emit('peer left', peer))

    return differences.added.length > 0 || differences.removed.length > 0
  }

  _onMessage (event) {
    const message = event.detail

    if (message.topic === this._topic) {
      this.emit('message', message)
    }
  }

  _handleDirectMessage (message) {
    if (message.to.toString() !== this._libp2p.peerId.toString()) {
      return
    }

    if (message.topic === this._topic) {
      const m = Object.assign({}, message)
      delete m.to
      this.emit('message', m)
    }
  }
}
