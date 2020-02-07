const urlWallet = new UrlWalletSDK(ifr)

console.log('provider', urlWallet.ethProvider)
console.log('my web3', web3)
console.log('web3 current provider', web3.currentProvider)

urlWallet.ethProvider.on('initialized', port => {
  main().then(() => {
    setConnectStatus('success')
  })
})

urlWallet.ethProvider.on('window_blocked', port => {
  console.error('pop-up window is blocked (message from dapp)')
})

urlWallet.ethProvider.on('initiateFailure', resp => {
  setConnectStatus('init failed: ' + resp.msg)
})

document.getElementById('doConnect').addEventListener('click', () => {
  let url
  try {
    url = new URL(document.getElementById('connectorUrl').value)
  } catch (e) {
    url.value = ''
    console.error(e)
    return
  }
  urlWallet.dispose()
  setConnectStatus('loading')
  urlWallet.start(url.href, url.origin)
})

// init a default one
// document.getElementById('doConnect').dispatchEvent(new Event('click'))

function main() {
  return Promise.resolve()
  .then(() => {
    return web3.eth.getChainId()
    .then(id => {
      document.getElementById('chainId').value = id
    })
  }).then(() => {
    return urlWallet.getCurrentAddress()
    .then(addr => {
      if (addr != null) {
        return addr
      }
      // fallback
      console.warn('No addresses found. Trying to request from the provider...')
      return urlWallet.requestAccounts(true).then(accounts => {
        if (accounts.length != 0) {
          return accounts[0]
        }
        return null
      })
    })
    .then(addr => {
      if (addr) {
        document.getElementById('currentAddress').value = addr
        web3.eth.defaultAccount = addr
      } else {
        throw new Error('Cannot init URL wallet: Failed to request the active account from the iframe.')
      }
    })
  }).then(() => {
    return web3.eth.getBalance(web3.eth.defaultAccount)
    .then(bal => {
      document.getElementById('currentBalance').value = web3.utils.fromWei(bal)
    })
  })
}
