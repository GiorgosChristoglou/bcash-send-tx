const bcoin = require('bcoin').set('bitcoincashtestnet');

var logger = new bcoin.logger({
  level: 'spam',
  color: true
});

const spv = new bcoin.spvnode({
  network: bcoin.network.get().toString(),
  httpPort: 3000,
  db: 'leveldb',
  logger: logger
});

var walletdb = new bcoin.walletdb({
  db: 'leveldb',
  logger: logger,
  location: '/home/gglou/.bcoin/bitcoincashtestnet/wallet',
  spv: true
});

spv.on('error', function(err) {
  logger.error(err);
});

spv.pool.on('tx', async(tx) => {
  console.log('New transaction detected ' + tx);
  await walletdb.addTX(tx);
});

spv.on('block', async(block) => {
  console.log('New block ' + spv.chain.height);
});

spv.on('connect', async(entry, block) => {
    await walletdb.addBlock(entry, block.txs);
});

(async () => {
  await spv.open();
  await spv.connect();
  await walletdb.open();

  spv.startSync();

  const wallet = await walletdb.get('primary');

  wallet.on('balance', async(balance) => {
  // Convert satoshis to BTC.
    var btc = bcoin.amount.btc(balance.unconfirmed);
    console.log('Your wallet balance has been updated: %s', btc);
    console.log(await wallet.getBalance());
  });

  // Satoshi's per kilobyte.
  rate=20000;
  script = bcoin.script.fromNulldata(Buffer.from("Hello World"));
  output = bcoin.output.fromScript(script, 0);

  const options = {
    rate: rate,
    outputs: [output],
    passphrase: 'passphrase',
    confirmed: true
  };

  const account = await wallet.getAccount('default');
  // Add our address to the spv filter.
  //const balance = await wallet.getBalance('default');
  const tx = await wallet.send(options);

  console.log(tx);

  spv.pool.watchAddress(account.deriveReceive(0).getAddress('base58'));
})().catch((err) => {
    console.error(err.stack);
    process.exit(1);
});