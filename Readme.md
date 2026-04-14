# 🟢 Stellar Green Belt - Advanced Crowdfunding dApp

A production-ready decentralized crowdfunding application built on Stellar Testnet with Soroban smart contracts, CI/CD pipeline, and mobile-responsive design.

## 🌐 Live Demo
**[https://stellar-greenbelt.vercel.app](https://stellar-greenbelt.vercel.app)**

## 📋 Contract Details
- **Contract ID:** `CAZYTHFYCLFPFNBX7ANOVT5ZGCJYKZWPTAT7CIMJDEJEZZWAJK64IPIY`
- **Deploy TX:** `a68e14a2623102b31167cb219608a0254c951ab77afdfbfe3214d02228400619`
- **Initialize TX:** `f8cb1b962b9cf3c68729650b79a0fbf14da10cf00c0b72d887d381f5685151f8`
- **Network:** Stellar Testnet
- **Explorer:** [View on Stellar Expert](https://stellar.expert/explorer/testnet/contract/CAZYTHFYCLFPFNBX7ANOVT5ZGCJYKZWPTAT7CIMJDEJEZZWAJK64IPIY)

## ✨ Features
- 🔗 Multi-wallet support (Freighter, Lobstr, xBull)
- 📊 Real-time campaign progress with caching
- 💝 Donate XLM directly to Soroban smart contract
- ⏳ Live transaction status tracking (pending → success/failed)
- 📱 Mobile responsive design
- 🔄 CI/CD pipeline with GitHub Actions
- ⚠️ 3 error types handled: wallet not found, rejected, insufficient balance

## 🛠️ Tech Stack
- **Frontend:** React + Vite
- **Smart Contract:** Rust + Soroban SDK
- **Blockchain:** Stellar Testnet (Horizon + Soroban RPC)
- **Wallet:** Freighter API v6
- **Deployment:** Vercel
- **CI/CD:** GitHub Actions

## 🧪 Tests (4 Passing)
```
test test::test_initialize     ... ok
test test::test_donate         ... ok
test test::test_goal_not_reached ... ok
test test::test_goal_reached   ... ok

test result: ok. 4 passed; 0 failed
```

## 🚀 Setup Instructions

### Prerequisites
- Node.js v18+
- Rust + Cargo
- Stellar CLI
- Freighter Wallet browser extension

### Run Frontend Locally
```bash
cd frontend
npm install
npm run dev
```
Open http://localhost:5173

### Build & Deploy Contract
```bash
cd crowdfund-contract
stellar contract build
stellar contract deploy --wasm target/wasm32v1-none/release/hello_world.wasm --source deployer --network testnet
```

### Run Contract Tests
```bash
cd crowdfund-contract
cargo test
```

## 📸 Screenshots
See `/screenshots` folder for:
- Wallet connection modal :- https://github.com/jayantvaibhavspj/stellar-greenbelt/blob/8ca7099dd71fc2a9a31cd5f7bc4e25dfb25b0f66/screenshots/wallet-modal.png.png
- Main page desktop view :- https://github.com/jayantvaibhavspj/stellar-greenbelt/blob/8ca7099dd71fc2a9a31cd5f7bc4e25dfb25b0f66/screenshots/Main%20page%20-%20desktop%20view.png.png
- Donation success :- https://github.com/jayantvaibhavspj/stellar-greenbelt/blob/8ca7099dd71fc2a9a31cd5f7bc4e25dfb25b0f66/screenshots/Donation%20success.png.png
- Mobile responsive view :- https://github.com/jayantvaibhavspj/stellar-greenbelt/blob/8ca7099dd71fc2a9a31cd5f7bc4e25dfb25b0f66/screenshots/mobile-responsive.png.png
- CI/CD pipeline passing :- https://github.com/jayantvaibhavspj/stellar-greenbelt/blob/8ca7099dd71fc2a9a31cd5f7bc4e25dfb25b0f66/screenshots/CICD%20pipeline%20passing.png.png

## 🔄 CI/CD Pipeline
GitHub Actions automatically runs contract tests on every push to `main`.
See `.github/workflows/ci.yml` for pipeline configuration.

## 📁 Project Structure
```
stellar-greenbelt/
├── .github/
│   └── workflows/
│       └── ci.yml          # CI/CD pipeline
├── crowdfund-contract/
│   └── contracts/
│       └── hello-world/
│           └── src/
│               ├── lib.rs  # Smart contract
│               └── test.rs # Contract tests
└── frontend/
    └── src/
        ├── App.jsx         # Main React component
        └── App.css         # Styles
```

---
Built for **Stellar Green Belt Challenge** 🟢
