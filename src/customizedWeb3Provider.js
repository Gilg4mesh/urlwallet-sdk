import { EventEmitter } from 'events'

class MessageHub {
  constructor(port, dispatcher) {
    this.port = port
    this.walletUrl = null
    this.dispatcher = dispatcher

    this.log = console.log
    this.port.addEventListener('message', this._onReceive.bind(this))
    this.callbackMap = new Map()
  }

  getCallbackNonce() {
    return 'cb' + Math.floor(Math.random() * 1e9)
  }

  dispatch(method, payload, callback) {
    const nonce = this.getCallbackNonce()
    this.log('--- DISPATCH ---', 'method:', method, '\npayload:', payload)
    this.callbackMap.set(nonce, callback)
    this.port.postMessage({ nonce, method, payload })
  }

  _onReceive(msgevt) {
    const {data} = msgevt
    if ('windowBlocked' in data) {
      return this.dispatcher.emit('window_blocked', this.dispatcher.port)
    }
    if ('notification' in data) {
      return this._handleNotif(data)
    }
    if ('nonce' in data) {
      return this._handleResponse(data)
    }
    const err = new Error('Received message from the bridge of unsupported format')
    err._msgevt = msgevt
    throw err
  }

  _handleNotif(data) {
    const {method, params} = data.notification
    return this.dispatcher.emit('notification', params)
  }

  _handleResponse(data) {
    const callback = this.callbackMap.get(data.nonce)

    if (callback == undefined) {
      console.error(`Received response of unknown nonce ${data.nonce}`)
      return
    }

    // to prevent callback calling twice;
    // TODO: set deadline
    this.callbackMap.delete(data.nonce)
    if (data.error) {
      console.warn('--- RESPONSE ---', 'nonce:', data.nonce, '\nerror:', data.error)
      if (data.error.message === 'Site not enabled.' && this.walletUrl) {
        window.open(this.walletUrl, '_new')
      }
    } else {
      this.log ('--- RESPONSE ---', 'nonce:', data.nonce, '\nresponse:', data.response)
    }
    callback(data.error || null, data.response)
  }
}

// MessageHub.prototype.onNotificationEventName = Symbol('onNotification')

class CustomizedWeb3Provider extends EventEmitter {
  constructor() {
    super()
    this.hub = null
  }

  init(port) {
    this.port = port
    this.hub = new MessageHub(port, this)
    this.port.start()
    this.emit('initialized', port)
  }

  setWalletUrl(walletUrl) {
    this.hub.walletUrl = walletUrl
  }

  // --- define methods here that are ONLY meant be compatible with an ordinary web3 provider ---
  send(method, params = []) {
    // construct JSON-RPC like payload
    const payload = { method, params }

    return new Promise((resolve, reject) => {
      this.hub.dispatch('send', payload, (error, response) => {
        (error == null ? resolve(response) : reject(error))
      })
    })
  }
}

// To convince Web3.js (v2.x) that this provider is EIP-1193 compliant
CustomizedWeb3Provider.prototype.isEIP1193 = true

export { CustomizedWeb3Provider }
