'use strict'

const EventEmitter = require('events')
const pipe = require('it-pipe')
const { fromString: uint8ArrayFromString } = require('uint8arrays/from-string')

const emitter = new EventEmitter()

function handler ({ connection, stream }) {
  const peerId = connection.remotePeer.toB58String()

  pipe(
    stream,
    async function (source) {
      for await (const message of source) {
        let msg

        try {
          msg = JSON.parse(message.toString())
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

        msg.data = uint8ArrayFromString(msg.data, 'hex')
        msg.seqno = uint8ArrayFromString(msg.seqno.padStart(msg.seqno.length % 2 === 0 ? msg.seqno.length : msg.seqno.length + 1, '0'), 'hex')

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
