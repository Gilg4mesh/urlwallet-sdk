class ProviderBridge {
  // maybe adopt to a JSON RPC library?
  constructor(provider, port, extensionPort) {
    this.provider = provider
    this.port = port
    this.methodMap = new Map([
      ['send', this.send],
      ['currentAddress', this.getCurrentAddress],
    ])
    this.sendRoutingMap = new Map([
      // ['sendTransaction', this._signAndSendRawTransaction],
    ])
    this.queue = new Map()
    this.onqueuechange = null

    this.currentAddress = null

    this._incomingHandler = this._handleRpc.bind(this)
    this._outgoingHandler = this._handleNotif.bind(this)
    
    if (this.provider.sendAsync) {
      // MetaMask is NOT EIP-1193 compliant as of 2019/11/20
      console.warn('The provider is probably not EIP-1193 compliant. ' +
        'Will send with legacy, callback-based method "sendAsync".')
      this.sendAsync = this._sendAsyncLegacy
    } else {
      this.sendAsync = this._sendAsync
    }
  }

  bindSubscriptionEvents(target) {
    let providerEmitter = null
    if (target) {
      providerEmitter = target
    } else {
      // auto-detect
      providerEmitter = this.provider
      if (this.provider.host == 'CustomProvider') {
        providerEmitter = this.provider.connection
      }
    }

    if (providerEmitter && providerEmitter.on) {
      // if MetaMask were EIP-1193-compliant...
      // this.provider.on('notification', this.outgoingHandler)
      providerEmitter.on('data', (err, result) => {
        if (err) throw err
        return this._outgoingHandler(result)
      })
      return true
    } else {
      return false
    }
  }

  _queueChange(entry, removed) {
    if (this.onqueuechange) {
      if (removed) {
        this.onqueuechange(entry, null, this.queue)
      } else {
        const newValue = this.queue.get(entry)
        this.onqueuechange(entry, newValue, this.queue)
      }
    }
  }

  _handleRpc(msgevt) {
    const {method} = msgevt.data
    if (method == undefined) {
      console.error('No method provided')
      return
    }

    const handler = this.methodMap.get(method)
    if (handler == undefined) {
      console.error(`No such method "${method}".`)
      return
    }

    let desc = method
    if (method == 'send') {
      desc += ` "${msgevt.data.payload.method}"`
    }
    const ident = Symbol(desc)
    this.queue.set(ident, 'pending')
    this._queueChange(ident, false)

    const {nonce, payload} = msgevt.data

    return (handler.bind(this))(payload)
      .then(response => {
        this.port.postMessage({ nonce, response })
        this.queue.set(ident, 'resolved')
        this._queueChange(ident, false)
      })
      .catch(error => {
        this.port.postMessage({ nonce, error })
        this.queue.set(ident, 'rejected')
        this._queueChange(ident, false)
      })
  }

  _handleNotif(notif) {
    // notif is a JSON-RPC response notification
    this.port.postMessage({ notification: notif })
  }

  send(payload) {
    if (typeof payload === 'string') {
      return Promise.reject(new Error('Invalid JSON-RPC request. ' +
        'send() only allows an object as its payload.'))
    }

    console.log('MyRPC forwarding "send":', payload)

    if (this.sendRoutingMap.has(payload.method)) {
      return this.sendRoutingMap.get(payload.method)(payload)
    }
    return this.sendAsync(payload)
  }

  _sendAsyncLegacy(payload) {
    return new Promise((resolve, reject) => {
      this.provider.sendAsync(payload, (error, response) => {
        if (error != null) {
          reject(error)
        } else {
          resolve(response.result)
        }
      })
    })
  }

  _sendAsync(payload) {
    if (this.provider.sendPayload) {
      payload.jsonrpc = '2.0'
      payload.id = 1
      return this.provider.sendPayload(payload).then(x => {
        if (x.error) {
          throw x.error
        }
        return x.result
      })
    }
    return this.provider.send(payload.method, payload.param)
  }

  getCurrentAddress() {
    // injected web3 has a selectedAddress as default
    if ('selectedAddress' in this.provider) {
      return Promise.resolve([this.provider.selectedAddress])
    }
    return Promise.resolve([this.currentAddress])
  }

  // _sendTransactionMiddleware(params) {
  //   if (params[0].gas == null) {
  //     console.warn('Not specifying gas limit, auto-calculated...')
  //     // TODO: estimate gas
  //     params[0].gas = 21000
  //   }
  // }
}

export default ProviderBridge
