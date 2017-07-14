# ipfs-pubsub-room

[![Build Status](https://travis-ci.org/ipfs-labs/ipfs-pubsub-room.svg?branch=master)](https://travis-ci.org/ipfs-labs/ipfs-pubsub-room)

> Creates a room based on an IPFS pub-sub channel. Emits membership events, listens for messages, broadcast and direct messeges to peers.

([Demo video](https://t.co/HNYQGE4D4P))

## Install

```bash
$ npm install ipfs-pubsub-room
```

## Use

```js
const Room = require('ipfs-pubsub-room')
const ipfs = new IPFS()

const room = Room(ipfs, 'room-name')
```

## API

### Room (ipfs:IPFS, roomName:string, options:object)

* `ipfs`: IPFS object. Must have pubsub activated
* `roomName`: string, global identifier for the room
* `options`: object:
  * `pollInterval`: interval for polling the pubsub peers, in ms. Defaults to 1000.

```js
const room = Room(ipfs, 'some-room-name')
```

## room.broadcast(message)

Broacasts message (string or buffer).

## room.sendTo(peer, message)

Sends message (string or buffer) to peer.

## room.leave()

Leaves room, stopping everything.

## room.getPeers()

Returns an array of peer identifiers (strings).

## room.hasPeer(peer)

Returns a boolean indicating if the given peer is present in the room.

## room.on('message', (message) => {})

Listens for messages. A `message` is an object containing the following properties:

* `from` (string): peer id
* `data` (Buffer): message content

## room.on('peer joined', (peer) => {})

Once a peer has joined the room.

## room.on('peer left', (peer) => {})

Once a peer has left the room.

## License

ISC
