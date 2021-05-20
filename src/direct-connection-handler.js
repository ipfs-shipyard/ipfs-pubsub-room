'use strict'

const EventEmitter = require('events')
const pipe = require('it-pipe')
const uint8ArrayToString = require('uint8arrays/to-string')

const emitter = new EventEmitter()

const hexStringToUint8Array = (str) => {
  const size = str.length / 2
  const buf = new Uint8Array(size)
  for (let i = 0; i < size; i += 1) {
    buf[i] = parseInt(str.slice(i * 2, i * 2 + 2), 16)
  }
  buf.toString = function () { return uint8ArrayToString(this) }
  return buf
}

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

        msg.data = hexStringToUint8Array(msg.data)
        msg.seqno = hexStringToUint8Array(msg.seqno)

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
