import ProviderBridge from './provider-bridge'

let handshaked = null

function respondToHandshake(port, error, bridge) {
  if (error == null) {
    port.onmessage = bridge._incomingHandler
    port.postMessage({ok: true, msg: 'handshake ACK'})
  } else {
    // act like if the connection were closed
    port.onmessage = () => {}
    port.postMessage({ok: false, msg: 'handshake failed', error: error})
  }
}

function postMessageHandler(evt) {
  if (!evt.origin) {
    return
  }
  if (location.origin == evt.origin) {
    console.debug('Ignoring self-calling message')
    return
  }

  console.log('iframe onmessage', evt.data, 'from', evt.origin, evt)

  // drop all non-handshaking events
  if (evt.data.action == 'handshake') {
    if (handshaked) {
      console.warn('Repeated handshake to iframe! Ignoring...')
      return
    }
    handshaked = true

    const bridge = new ProviderBridge(web3.currentProvider, evt.ports[0])
    respondToHandshake(evt.ports[0], null, bridge)
    
    // try to call
    if (main) 
      main(bridge)
  } else {
    console.error(evt)
  }
}

window.addEventListener('message', postMessageHandler)
