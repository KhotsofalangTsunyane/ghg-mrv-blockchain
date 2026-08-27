# EmissionsMRV frontend

A no-build-step web interface for the EmissionsMRV contract. Plain HTML,
CSS and JavaScript, using ethers.js (loaded from a CDN) to talk to
MetaMask. No React, no npm packages required for the frontend itself.

## 1. Set your contract address

Open `abi.js` and replace the placeholder:

```js
const CONTRACT_ADDRESS = "0xPASTE_YOUR_DEPLOYED_CONTRACT_ADDRESS_HERE";
```

with the address you got from `npm run deploy:sepolia` (see the main
project README).

## 2. Run it locally

Browsers block MetaMask from injecting into pages opened directly as a
file (`file://...`), so serve the folder over a local HTTP server. Any of
these work:

**Option A — VS Code Live Server extension**
Right-click `index.html` → "Open with Live Server."

**Option B — a one-line static server**
```bash
cd frontend
npx serve .
```
Then open the URL it prints (usually `http://localhost:3000`).

## 3. Using it

1. Click **Connect wallet** and approve in MetaMask. Make sure MetaMask is
   set to the Sepolia network — the app will prompt you to switch if not.
2. Your role badge (Regulator / Verifier / Facility / Connected) appears
   next to your address, based on what the contract says about your
   wallet.
3. If you're the regulator: register a facility (section 01) and add a
   verifier (section 02).
4. If you're a registered facility wallet: pick a report file in section
   03 — its hash is computed in your browser and shown before you submit,
   so you can see exactly what's about to go on-chain.
5. If you're a verifier: approve or reject a record by ID in section 04.
6. Anyone can look up a facility or record by ID in section 05, free of
   gas cost.
7. Section 06 shows a live feed of on-chain events as they happen 

## Notes

- This is a static site with no backend — it talks directly to the
  blockchain through the wallet extension. That's appropriate here: the
  smart contract itself is the backend.
- The file you upload for hashing is never sent anywhere. Only its
  keccak256 hash, computed locally, gets sent in the transaction.
