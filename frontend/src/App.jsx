import { useState, useEffect, useCallback } from 'react';
import * as StellarSdk from '@stellar/stellar-sdk';
import { isConnected, requestAccess, getAddress, signTransaction } from '@stellar/freighter-api';
import './App.css';

const CONTRACT_ID = 'CAZYTHFYCLFPFNBX7ANOVT5ZGCJYKZWPTAT7CIMJDEJEZZWAJK64IPIY'
const SOROBAN_URL = 'https://soroban-testnet.stellar.org';
const HORIZON_URL = 'https://horizon-testnet.stellar.org';
const NETWORK_PASSPHRASE = StellarSdk.Networks.TESTNET;
const DEPLOYER = 'GBXZE3L2RJMKCOFJNKXIETTFBMHSNF6W3JPKJI662YMTJ5REBLN4ZKIF';
const GOAL = 1000;

const getSorobanServer = () => {
  if (StellarSdk.SorobanRpc?.Server) return new StellarSdk.SorobanRpc.Server(SOROBAN_URL);
  if (StellarSdk.rpc?.Server) return new StellarSdk.rpc.Server(SOROBAN_URL);
  throw new Error('SorobanRpc not found');
};

const horizon = new StellarSdk.Horizon.Server(HORIZON_URL);

const App = () => {
  const [publicKey, setPublicKey] = useState(null);
  const [balance, setBalance] = useState('0');
  const [donated, setDonated] = useState(0);
  const [donateAmount, setDonateAmount] = useState('');
  const [txStatus, setTxStatus] = useState(null);
  const [txHash, setTxHash] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [walletType, setWalletType] = useState(null);
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [contractLoading, setContractLoading] = useState(true);
  const [cachedState, setCachedState] = useState(null);
  const [lastFetched, setLastFetched] = useState(null);

  const handleError = (err) => {
    if (err.message?.includes('User declined') || err.message?.includes('rejected')) {
      setError('❌ Transaction rejected by user.');
    } else if (err.message?.includes('insufficient') || err.message?.includes('balance')) {
      setError('❌ Insufficient balance to complete transaction.');
    } else if (err.message?.includes('not found') || err.message?.includes('install') || err.message?.includes('detect')) {
      setError('❌ Wallet not found. Please install Freighter from freighter.app');
    } else {
      setError('❌ Error: ' + err.message);
    }
  };

  const fetchBalance = useCallback(async (address) => {
    try {
      const account = await horizon.accounts().accountId(address).call();
      const xlm = account.balances.find(b => b.asset_type === 'native');
      setBalance(xlm ? parseFloat(xlm.balance).toFixed(2) : '0');
    } catch (e) {
      console.error('Balance fetch error:', e);
    }
  }, []);

  const fetchContractState = useCallback(async (forceRefresh = false) => {
    // Basic caching - only fetch if > 15 seconds old
    const now = Date.now();
    if (!forceRefresh && cachedState && lastFetched && (now - lastFetched) < 15000) {
      return;
    }
    try {
      setContractLoading(true);
      const server = getSorobanServer();
      const contract = new StellarSdk.Contract(CONTRACT_ID);
      const account = await server.getAccount(DEPLOYER);
      const tx = new StellarSdk.TransactionBuilder(account, {
        fee: StellarSdk.BASE_FEE,
        networkPassphrase: NETWORK_PASSPHRASE,
      })
        .addOperation(contract.call('get_state'))
        .setTimeout(30)
        .build();

      const result = await server.simulateTransaction(tx);
      if (result?.result) {
        const val = StellarSdk.scValToNative(result.result.retval);
        const donatedAmount = Number(val.total_donated) / 10000000;
        setDonated(donatedAmount);
        setCachedState(val);
        setLastFetched(Date.now());
      }
    } catch (e) {
      console.error('Contract state error:', e.message);
    } finally {
      setContractLoading(false);
    }
  }, [cachedState, lastFetched]);

  const connectFreighter = async () => {
    setError(null);
    setLoading(true);
    try {
      const connected = await isConnected();
      if (!connected) throw new Error('Wallet not found. Please install Freighter from freighter.app');
      await requestAccess();
      const { address } = await getAddress();
      setPublicKey(address);
      setWalletType('Freighter');
      setShowWalletModal(false);
      await fetchBalance(address);
    } catch (err) {
      handleError(err);
    } finally {
      setLoading(false);
    }
  };

  const disconnectWallet = () => {
    setPublicKey(null);
    setWalletType(null);
    setBalance('0');
    setError(null);
    setTxStatus(null);
    setTxHash(null);
  };

  const donate = async () => {
    setError(null);
    setTxStatus('pending');
    setTxHash(null);

    try {
      if (!donateAmount || parseFloat(donateAmount) <= 0) {
        throw new Error('Please enter a valid amount');
      }
      if (parseFloat(donateAmount) > parseFloat(balance)) {
        throw new Error('insufficient balance');
      }

      const server = getSorobanServer();
      const amountStroops = BigInt(Math.floor(parseFloat(donateAmount) * 10000000));
      const contract = new StellarSdk.Contract(CONTRACT_ID);
      const account = await server.getAccount(publicKey);

      const tx = new StellarSdk.TransactionBuilder(account, {
        fee: StellarSdk.BASE_FEE,
        networkPassphrase: NETWORK_PASSPHRASE,
      })
        .addOperation(
          contract.call(
            'donate',
            StellarSdk.nativeToScVal(publicKey, { type: 'address' }),
            StellarSdk.nativeToScVal(amountStroops, { type: 'i128' })
          )
        )
        .setTimeout(30)
        .build();

      const prepared = await server.prepareTransaction(tx);
      const xdr = prepared.toEnvelope().toXDR('base64');
      const { signedTxXdr } = await signTransaction(xdr, { networkPassphrase: NETWORK_PASSPHRASE });
      const signedTx = StellarSdk.TransactionBuilder.fromXDR(signedTxXdr, NETWORK_PASSPHRASE);
      const response = await server.sendTransaction(signedTx);

      setTxHash(response.hash);

      let attempts = 0;
      const poll = setInterval(async () => {
        attempts++;
        try {
          const status = await server.getTransaction(response.hash);
          if (status.status === 'SUCCESS') {
            clearInterval(poll);
            setTxStatus('success');
            setDonateAmount('');
            await fetchBalance(publicKey);
            await fetchContractState(true);
          } else if (status.status === 'FAILED' || attempts > 15) {
            clearInterval(poll);
            setTxStatus('failed');
            setError('❌ Transaction failed on chain.');
          }
        } catch (e) {
          if (attempts > 15) { clearInterval(poll); setTxStatus('failed'); }
        }
      }, 2000);

    } catch (err) {
      handleError(err);
      setTxStatus('failed');
    }
  };

  useEffect(() => {
    fetchContractState(true);
    const interval = setInterval(() => fetchContractState(), 15000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (publicKey) {
      fetchBalance(publicKey);
      const interval = setInterval(() => fetchBalance(publicKey), 10000);
      return () => clearInterval(interval);
    }
  }, [publicKey, fetchBalance]);

  const progress = Math.min((donated / GOAL) * 100, 100);

  return (
    <div className="container">
      <header className="header">
        <h1>🌟 Stellar Crowdfund</h1>
        <p>Support our campaign on Testnet</p>
      </header>

      {error && <div className="alert alert-error">{error}</div>}

      {/* Campaign Progress */}
      <section className="card">
        <h2>Campaign Progress {contractLoading && <span className="loading-dot">●</span>}</h2>
        <div className="progress-bar-bg">
          <div className="progress-bar-fill" style={{ width: `${progress}%` }} />
        </div>
        <div className="progress-labels">
          <span>{donated.toFixed(2)} XLM raised</span>
          <span>Goal: {GOAL} XLM</span>
        </div>
        <div className="progress-percent">{progress.toFixed(1)}% Complete</div>
        {lastFetched && (
          <div className="cache-info">Last updated: {new Date(lastFetched).toLocaleTimeString()}</div>
        )}
        {progress >= 100 && <div className="alert alert-success">🎉 Goal Reached!</div>}
      </section>

      {/* Wallet */}
      <section className="card">
        <h2>Wallet</h2>
        {!publicKey ? (
          <button className="btn btn-primary" onClick={() => setShowWalletModal(true)} disabled={loading}>
            {loading ? <span>⏳ Connecting...</span> : 'Connect Wallet'}
          </button>
        ) : (
          <div className="wallet-info">
            <div className="info-box">
              <label>Connected via {walletType}:</label>
              <code className="address">{publicKey}</code>
            </div>
            <div className="info-box">
              <label>Balance:</label>
              <h3 className="balance">{balance} XLM</h3>
            </div>
            <button className="btn btn-secondary" onClick={disconnectWallet}>Disconnect</button>
          </div>
        )}
      </section>

      {/* Wallet Modal */}
      {showWalletModal && (
        <div className="modal-overlay" onClick={() => setShowWalletModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>Choose Wallet</h2>
            <p>Select your Stellar wallet to connect</p>
            <button className="btn btn-primary wallet-option" onClick={connectFreighter}>
              🔑 Freighter Wallet
            </button>
            <button className="btn btn-secondary wallet-option" onClick={() => {
              setError('❌ Wallet not found. Please install Lobstr from lobstr.co');
              setShowWalletModal(false);
            }}>💼 Lobstr Wallet (Not Installed)</button>
            <button className="btn btn-secondary wallet-option" onClick={() => {
              setError('❌ Wallet not found. Please install xBull from xbull.app');
              setShowWalletModal(false);
            }}>🌐 xBull Wallet (Not Installed)</button>
            <button className="btn btn-danger" onClick={() => setShowWalletModal(false)}>Cancel</button>
          </div>
        </div>
      )}

      {/* Donate */}
      {publicKey && (
        <section className="card">
          <h2>Make a Donation</h2>
          <div className="form-group">
            <label>Amount (XLM)</label>
            <input
              type="number"
              placeholder="0.00"
              min="0"
              step="0.1"
              value={donateAmount}
              onChange={e => setDonateAmount(e.target.value)}
              disabled={txStatus === 'pending'}
            />
          </div>
          <button
            className="btn btn-success"
            onClick={donate}
            disabled={txStatus === 'pending' || !donateAmount}
          >
            {txStatus === 'pending' ? '⏳ Processing...' : '💝 Donate XLM'}
          </button>

          {txStatus === 'pending' && <div className="tx-status pending">⏳ Transaction pending on blockchain...</div>}
          {txStatus === 'success' && (
            <div className="tx-status success">
              ✅ Donation successful!
              {txHash && (
                <a href={`https://stellar.expert/explorer/testnet/tx/${txHash}`} target="_blank" rel="noopener noreferrer" className="tx-link">
                  View Transaction →
                </a>
              )}
            </div>
          )}
          {txStatus === 'failed' && <div className="tx-status failed">❌ Transaction failed. Please try again.</div>}
        </section>
      )}

      {/* Contract Info */}
      <section className="card">
        <h2>Contract Info</h2>
        <div className="info-box">
          <label>Contract ID:</label>
          <code className="address">{CONTRACT_ID}</code>
        </div>
        <div className="info-box">
          <label>Deploy TX:</label>
          <code className="address">ded012df0cb2c784b2255597bbd247c5ffa3bc11c7911b71e191676ca5ac806e</code>
        </div>
        <a href={`https://stellar.expert/explorer/testnet/contract/${CONTRACT_ID}`} target="_blank" rel="noopener noreferrer" className="btn btn-info">
          View on Stellar Expert →
        </a>
      </section>

      <footer className="footer">
        <p>Built for Stellar green Belt Challenge 🟢</p>
      </footer>
    </div>
  );
};

export default App;
