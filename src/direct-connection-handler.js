import EventEmitter from 'events'
import { pipe } from 'it-pipe'
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string'
import { toString as uint8ArrayToString } from 'uint8arrays/to-string'
import PROTOCOL from './protocol.js'

export const emitter = new EventEmitter()

export function handle (libp2p) {
  // can only register one handler for the protocol
  libp2p.handle(PROTOCOL, handler).catch(err => {
    if (err.code !== 'ERR_PROTOCOL_HANDLER_ALREADY_REGISTERED') {
      console.error(err) // eslint-disable-line no-console
    }
  })
}

export function unhandle (libp2p) {
  libp2p.unhandle(PROTOCOL, handler)
}

function handler ({ connection, stream }) {
  const peerId = connection.remotePeer.toString()

  pipe(
    stream,
    async function (source) {
      for await (const message of source) {
        let msg

        try {
          msg = JSON.parse(uint8ArrayToString(message))
        } catch (err) {
          emitter.emit('warning', err.message)
          continue // early
        }

        if (peerId !== msg.from.toString()) {
          emitter.emit('warning', 'no peerid match ' + msg.from)
          continue // early
        }

        msg.data = uint8ArrayFromString(msg.data, 'hex')
        msg.seqno = BigInt(msg.seqno)

        emitter.emit(msg.topic, msg)
      }
    }
  )
}
