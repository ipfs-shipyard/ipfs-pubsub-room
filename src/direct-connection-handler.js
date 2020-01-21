'use strict'

const EventEmitter = require('events')
const pipe = require('it-pipe')
const CID = require('cids')

const emitter = new EventEmitter()

function handler ({ connection, stream }) {
  const peerId = new CID(connection.remotePeer.toString()).toString()

  pipe(
    stream,
    async function (source) {
      for await (const message of source) {
        let msg

        try {
          msg = JSON.parse(message.toString())
          msg.to = new CID(msg.to.version, msg.to.codec, Buffer.from(msg.to.hash.data))
          msg.from = new CID(msg.from.version, msg.from.codec, Buffer.from(msg.from.hash.data))
        } catch (err) {
          emitter.emit('warning', err.message)
          continue // early
        }

        if (peerId !== msg.from.toString()) {
          emitter.emit('warning', 'no peerid match ' + msg.from)
          continue // early
        }

        const topicIDs = msg.topicIDs
        if (!Array.isArray(topicIDs)) {
          emitter.emit('warning', 'no topic IDs')
          continue // early
        }

        msg.data = Buffer.from(msg.data, 'hex')
        msg.seqno = Buffer.from(msg.seqno, 'hex')

        topicIDs.forEach((topic) => {
          emitter.emit(topic, msg)
        })
      }
    }
  )
}

exports = module.exports = {
  handler: handler,
  emitter: emitter
}
