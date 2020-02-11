// Sign
document.getElementById('signButton').addEventListener('click', () => {
  const value = document.getElementById('signBox').value
  cWeb3.eth.sign(value, cWeb3.eth.defaultAccount).then(sig => {
    document.getElementById('signature').value = sig
  })
})


// Transfer
const elTransfer = document.getElementById('transferButton')

elTransfer.addEventListener('click', () => {
  const dest = document.getElementById('receiver').value
  const amount = document.getElementById('amount').value

  const elTxStatus = document.getElementById('txstatus')

  const pe = cWeb3.eth.sendTransaction({
    from: cWeb3.eth.defaultAccount,
    to: dest,
    value: cWeb3.utils.toWei(amount),
    gasPrice: '1' + '0'.repeat(9),
    gasLimit: '21000',
  })

  let cnt = 0

  pe.on('confirmation', resp => {
    console.log('confirmation', resp)
    cnt++
    elTxStatus.value = `${cnt} confirmation`
  })
  pe.on('transactionHash', hash => {
    document.getElementById('txhash').value = hash
    elTxStatus.value = 'Waiting for confirmation...'
  })

  elTxStatus.value = 'Processing/Waiting for user consent...'
  elTransfer.disabled = true

  return pe.then(recipient => {
    elTxStatus.value = `Complete!`
    console.log(recipient)
  }).catch(err => {
    // err is NOT the ordinary error object. it's a custom plain object
    elTxStatus.value = `Failed: ${err.error.message}`
    console.error(err)
  }).finally(() => {
    elTransfer.disabled = false
  })
})