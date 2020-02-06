import { CustomizedWeb3Provider } from './customizedWeb3Provider'
import Web3 from 'web3'

class UrlWalletSDK {
  constructor(dom) {
    this.dom = dom
    this.ethProvider = new CustomizedWeb3Provider()
    if (window && window.web3 === undefined) {
      window.web3 = new Web3(this.ethProvider)
    }

    this.handshaked = false
    // this.currentProviderEvent = null  // unused
    this.port = null
    this.doHandshake = this._doHandshake.bind(this)
  }

  start(url, trustedOrigin) {
    this.trustedOrigin = trustedOrigin
    // this might not observe all page changes!
    // to do: https://stackoverflow.com/a/24726977
    this.dom.addEventListener('load', this.doHandshake)
    // to trigger the event at last
    this.dom.src = url
  }

  dispose() {
    this.dom.removeEventListener('load', this.doHandshake)
    // if (this.currentProviderEvent) {
    //   this.ethProvider.removeEventListener('initialized', this.currentProviderEvent)
    // }
  }

  _doHandshake() {
    if (this.handshaked) {
      console.log('The handshake event is fired more than once. ' +
        'Check the iframe is still the one you intent to interact!')
    }

    this.handshaked = true
    const foreignWindow = this.dom.contentWindow

    const channel = new MessageChannel()

    const handshakeHandler = msgevt => {
      console.log('parent recv', msgevt)
      if (msgevt.data.ok) {
        // ad-hoc way to clear one-shot handlers
        channel.port1.onmessage = null
        this.port = channel.port1
        this.ethProvider.init(channel.port1)
        this.ethProvider.setWalletUrl(this.dom.src)
      } else {
        this.ethProvider.emit('initiateFailure', msgevt.data)
      }
    }

    channel.port1.onmessage = handshakeHandler

    // Mind here: only send to the domain you trust!
    foreignWindow.postMessage({ method: 'handshake' }, this.trustedOrigin, [channel.port2])
  }

  // --- helper methods ---
  getCurrentAddress() {
    return new Promise((resolve, reject) => {
      this.ethProvider.hub.dispatch('currentAddress', null, (err, resp) => {
        (err ? reject(err) : resolve(resp))
      })
    }).then(accounts_ => {
      console.log(accounts_)
      if (accounts_ == null || accounts_.length == 0) {
        return Promise.resolve([])
      } else {
        return Promise.resolve(accounts_)
      }
    }).then(accounts => {
      console.log('accs', accounts)
      return accounts[0]
    })
  }

  requestAccounts(silentWhenUnsupported = false) {
    // known bug of MetaMask
    return this.ethProvider.send('eth_requestAccounts')//.then(x => x.result)
    .catch(err => {
      if (silentWhenUnsupported && err.code == -32601) {
        // message: "The method eth_requestAccounts does not exist/is not available"
        // FIXME: is this different from denied?
        return Promise.resolve([])
      } else {
        return Promise.reject(err)
      }
    })
  }
}

export default UrlWalletSDK
