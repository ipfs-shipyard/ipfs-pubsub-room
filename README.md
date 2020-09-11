# ipfs-pubsub-room

[![made by Protocol Labs](https://img.shields.io/badge/made%20by-Protocol%20Labs-blue.svg?style=flat-square)](https://protocol.ai)
[![Freenode](https://img.shields.io/badge/freenode-%23ipfs-blue.svg?style=flat-square)](http://webchat.freenode.net/?channels=%23ipfs)
[![Build Status](https://travis-ci.com/ipfs-shipyard/ipfs-pubsub-room.svg?branch=master)](https://travis-ci.com/ipfs-shipyard/ipfs-pubsub-room)

> Creates a room based on a LibP2P pub-sub channel. Emits membership events, listens for messages, broadcast and direct messeges to peers.

([Demo video](https://t.co/HNYQGE4D4P))

## Install

```bash
$ npm install ipfs-pubsub-room
```

## Use

Creating a pubsub room from a LibP2P node

```js
const Room = require('ipfs-pubsub-room')
const Libp2p = require('libp2p')

const libp2p = new Libp2p({ ... })
await libp2p.start()

// libp2p node is ready, so we can start using ipfs-pubsub-room
const room = Room(libp2p, 'room-name')
```

Creating a pubsub room from an IPFS node

```js
const Room = require('ipfs-pubsub-room')
const IPFS = require('ipfs')

const ipfs = await IPFS.create({ ... })
const room = Room(ipfs, 'room-name')
```

Once we have a room we can listen for messages

```js
room.on('peer joined', (peer) => {
  console.log('Peer joined the room', peer)
})

room.on('peer left', (peer) => {
  console.log('Peer left...', peer)
})

// now started to listen to room
room.on('subscribed', () => {
  console.log('Now connected!')
})
```

## API

### Room (libp2p:LibP2P, roomName:string, options:object)

* `libp2p`: LibP2P node. Must have pubsub activated
* `roomName`: string, global identifier for the room
* `options`: object:
  * `pollInterval`: interval for polling the pubsub peers, in ms. Defaults to 1000.

```js
const room = Room(libp2p, 'some-room-name')
```

## room.broadcast(message)

Broacasts message (string).

## room.sendTo(cid, message)

Sends message (string) to peer.

## async room.leave()

Leaves room, stopping everything.

## room.getPeers()

Returns an array of peer identifiers (strings).

## room.hasPeer(cid)

Returns a boolean indicating if the given peer is present in the room.

## room.on('message', (message) => {})

Listens for messages. A `message` is an object containing the following properties:

* `from` (string): peer id
* `data` (string): message content

## room.on('peer joined', (cid) => {})

Once a peer has joined the room.

## room.on('peer left', (cid) => {})

Once a peer has left the room.

## room.on('subscribed',() => {})

Once your program has subscribed the topic and announced through IPFS pubsub.

## License

ISC
