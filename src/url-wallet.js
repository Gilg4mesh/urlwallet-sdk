import ProviderBridge from './provider-bridge'

class UrlWallet {
  constructor() {
    this.handshaked = null
    this.bridge = null
    this.respondToHandshake = this._respondToHandshake.bind(this)
    this.postMessageHandler = this._postMessageHandler.bind(this)
    this.openWindowFromDapp = this._openWindowFromDapp.bind(this)
    this.openWindowFromIframe = this._openWindowFromIframe.bind(this)
  }

  _openWindowFromDapp(url) {
    this.bridge.port.postMessage({ url: location.origin + '/' + url })
  }

  _openWindowFromIframe(url) {
    const newWindow = window.open(url)
    if (!newWindow || newWindow.closed || newWindow.closed === undefined) {
      this.bridge.port.postMessage({ windowBlocked: true })
      return false
    }

    return true
  }

  _respondToHandshake(port, error) {
    if (error == null) {
      port.onmessage = this.bridge._incomingHandler
      port.postMessage({ok: true, msg: 'handshake ACK'})
    } else {
      // act like if the connection were closed
      port.onmessage = () => {}
      port.postMessage({ok: false, msg: 'handshake failed', error: error})
    }
  }

  _postMessageHandler(evt) {
    if (!evt.origin) {
      return
    }
    if (location.origin == evt.origin) {
      console.debug('Ignoring self-calling message')
      return
    }

    console.log('iframe onmessage', evt.data, 'from', evt.origin, evt)

    // drop all non-handshaking events
    if (evt.data.method == 'handshake') {
      if (this.handshaked) {
        console.warn('Repeated handshake to iframe! Ignoring...')
        return
      }
      this.handshaked = true

      this.bridge = new ProviderBridge(web3.currentProvider, evt.ports[0])
      this.respondToHandshake(evt.ports[0], null)

      window.postMessage({ 'method': 'handshakeDone' }, location.origin)
    } else {
      console.error(evt)
    }
  }
}

export default UrlWallet
