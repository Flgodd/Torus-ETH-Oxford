import { tcp } from '@libp2p/tcp'
import { identify } from '@libp2p/identify'
import { gossipsub } from '@chainsafe/libp2p-gossipsub'
import { noise } from '@chainsafe/libp2p-noise'
import { yamux } from '@chainsafe/libp2p-yamux'
import { mdns } from '@libp2p/mdns'

export const Libp2pOptions = {
  peerDiscovery: [
    mdns()
  ],
  addresses: {
    listen: ['/ip4/0.0.0.0/tcp/4001'],
    announce: [`/ip4/192.168.1.100/tcp/4001`] // Manually announce the correct IP
  },
  transports: [
    tcp()
  ],
  connectionEncrypters: [noise()],
  streamMuxers: [yamux()],
  services: {
    identify: identify(),
    pubsub: gossipsub({ allowPublishToZeroTopicPeers: true })
  }
}