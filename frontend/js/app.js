// ---------------------------------------------------------------------
// EmissionsMRV frontend logic. Vanilla JS + ethers.js v6, no build step.
// ---------------------------------------------------------------------

let provider, signer, contract, account;

const $ = (id) => document.getElementById(id);

const STATUS_LABELS = ["Pending", "Verified", "Rejected"];
const STATUS_CLASSES = ["stamp--pending", "stamp--verified", "stamp--rejected"];

function showBanner(message, type = "ok") {
  const el = $("banner");
  el.textContent = message;
  el.className = `banner banner--${type}`;
  el.classList.remove("hidden");
  window.clearTimeout(showBanner._t);
  showBanner._t = window.setTimeout(() => el.classList.add("hidden"), 6000);
}

function shortAddr(addr) {
  return addr ? `${addr.slice(0, 6)}…${addr.slice(-4)}` : "";
}

function toUnix(datetimeLocalValue) {
  return Math.floor(new Date(datetimeLocalValue).getTime() / 1000);
}

function fromUnix(unixSeconds) {
  const n = Number(unixSeconds);
  if (!n) return "—";
  return new Date(n * 1000).toLocaleString();
}

function txLink(hash) {
  // On a local chain there's no block explorer to link to, so just show
  // the hash as plain text instead of a broken link.
  if (!EXPLORER_BASE_URL) {
    return `<span class="mono">${shortAddr(hash)}</span>`;
  }
  return `<a class="tx-link" href="${EXPLORER_BASE_URL}/tx/${hash}" target="_blank" rel="noopener">${shortAddr(hash)}</a>`;
}

function logActivity(text) {
  const list = $("activityLog");
  const empty = list.querySelector(".log__empty");
  if (empty) empty.remove();
  const li = document.createElement("li");
  li.className = "log--new";
  li.textContent = text;
  list.prepend(li);
  window.setTimeout(() => li.classList.remove("log--new"), 2000);
}

// ---------------------------------------------------------------------
// Wallet connection
// ---------------------------------------------------------------------

async function connectWallet() {
  if (!window.ethereum) {
    showBanner("MetaMask not detected. Install it from metamask.io to continue.", "error");
    return;
  }
  if (CONTRACT_ADDRESS.includes("PASTE_YOUR")) {
    showBanner("Set CONTRACT_ADDRESS in abi.js before connecting.", "error");
    return;
  }

  try {
    provider = new ethers.BrowserProvider(window.ethereum);
    await provider.send("eth_requestAccounts", []);

    const network = await provider.getNetwork();
    if ("0x" + network.chainId.toString(16) !== EXPECTED_CHAIN_ID_HEX) {
      try {
        await window.ethereum.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: EXPECTED_CHAIN_ID_HEX }],
        });
      } catch (switchErr) {
        showBanner(`Please switch MetaMask to ${EXPECTED_CHAIN_NAME}.`, "error");
        return;
      }
    }

    signer = await provider.getSigner();
    account = await signer.getAddress();
    contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);

    $("connectBtn").classList.add("hidden");
    $("walletInfo").classList.remove("hidden");
    $("walletAddress").textContent = shortAddr(account);

    await updateRoleBadge();
    attachEventListeners();
    showBanner(`Connected as ${shortAddr(account)}`, "ok");
  } catch (err) {
    console.error(err);
    showBanner(err.message || "Could not connect wallet.", "error");
  }
}

async function updateRoleBadge() {
  const badge = $("roleBadge");
  try {
    const regulatorAddr = await contract.regulator();
    if (regulatorAddr.toLowerCase() === account.toLowerCase()) {
      badge.textContent = "Regulator";
      badge.className = "badge badge--regulator";
      return;
    }
    const verifier = await contract.isVerifier(account);
    if (verifier) {
      badge.textContent = "Verifier";
      badge.className = "badge badge--verifier";
      return;
    }
    const facilitySubmitter = await contract.isFacilitySubmitter
      ? await contract.isFacilitySubmitter(account).catch(() => false)
      : false;
    if (facilitySubmitter) {
      badge.textContent = "Facility";
      badge.className = "badge badge--facility";
      return;
    }
    badge.textContent = "Connected";
    badge.className = "badge";
  } catch (err) {
    console.error(err);
  }
}

// ---------------------------------------------------------------------
// Live event log
// ---------------------------------------------------------------------

function attachEventListeners() {
  contract.on("FacilityRegistered", (facilityId, name, submitter) => {
    logActivity(`Facility #${facilityId} "${name}" registered → ${shortAddr(submitter)}`);
  });
  contract.on("VerifierAdded", (verifier) => {
    logActivity(`Verifier added → ${shortAddr(verifier)}`);
  });
  contract.on("VerifierRemoved", (verifier) => {
    logActivity(`Verifier removed → ${shortAddr(verifier)}`);
  });
  contract.on("EmissionRecordSubmitted", (recordId, facilityId, reportHash, submittedBy) => {
    logActivity(`Record #${recordId} submitted for facility #${facilityId} by ${shortAddr(submittedBy)}`);
  });
  contract.on("EmissionRecordVerified", (recordId, verifiedBy, status) => {
    logActivity(`Record #${recordId} marked ${STATUS_LABELS[status]} by ${shortAddr(verifiedBy)}`);
  });
}

// ---------------------------------------------------------------------
// Guards
// ---------------------------------------------------------------------

function requireConnection() {
  if (!contract) {
    showBanner("Connect your wallet first.", "error");
    return false;
  }
  return true;
}

// ---------------------------------------------------------------------
// Regulator: register facility
// ---------------------------------------------------------------------

$("registerForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!requireConnection()) return;
  const name = $("facilityName").value.trim();
  const submitterAddr = $("submitterAddr").value.trim();
  const resultEl = $("registerResult");
  resultEl.textContent = "Submitting transaction…";
  try {
    const tx = await contract.registerFacility(name, submitterAddr);
    resultEl.innerHTML = `Transaction sent: ${txLink(tx.hash)} — waiting for confirmation…`;
    const receipt = await tx.wait();
    resultEl.innerHTML = `Facility registered. Confirmed in tx ${txLink(receipt.hash)}`;
    showBanner(`"${name}" registered successfully.`, "ok");
    e.target.reset();
  } catch (err) {
    console.error(err);
    resultEl.textContent = "";
    showBanner(parseError(err), "error");
  }
});

// ---------------------------------------------------------------------
// Regulator: manage verifiers
// ---------------------------------------------------------------------

async function setVerifier(add) {
  if (!requireConnection()) return;
  const addr = $("verifierAddr").value.trim();
  const resultEl = $("verifierResult");
  resultEl.textContent = "Submitting transaction…";
  try {
    const tx = add ? await contract.addVerifier(addr) : await contract.removeVerifier(addr);
    await tx.wait();
    resultEl.innerHTML = `${add ? "Verifier added" : "Verifier removed"}. Confirmed in tx ${txLink(tx.hash)}`;
    showBanner(add ? "Verifier added." : "Verifier removed.", "ok");
  } catch (err) {
    console.error(err);
    resultEl.textContent = "";
    showBanner(parseError(err), "error");
  }
}

$("verifierForm").addEventListener("submit", (e) => { e.preventDefault(); setVerifier(true); });
$("removeVerifierBtn").addEventListener("click", () => setVerifier(false));

// ---------------------------------------------------------------------
// Facility: submit emission record (with in-browser file hashing)
// ---------------------------------------------------------------------

let currentReportHash = null;

$("reportFile").addEventListener("change", async (e) => {
  const file = e.target.files[0];
  const preview = $("hashPreview");
  if (!file) {
    currentReportHash = null;
    preview.textContent = "No file selected";
    return;
  }
  preview.textContent = "Hashing file…";
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  currentReportHash = ethers.keccak256(bytes);
  preview.textContent = `keccak256: ${currentReportHash}`;
});

$("submitForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!requireConnection()) return;
  if (!currentReportHash) {
    showBanner("Select a report file first.", "error");
    return;
  }
  const facilityId = $("submitFacilityId").value;
  const periodStart = toUnix($("periodStart").value);
  const periodEnd = toUnix($("periodEnd").value);
  const resultEl = $("submitResult");
  resultEl.textContent = "Submitting transaction…";
  try {
    const tx = await contract.submitEmissionRecord(facilityId, currentReportHash, periodStart, periodEnd);
    resultEl.innerHTML = `Transaction sent: ${txLink(tx.hash)} — waiting for confirmation…`;
    const receipt = await tx.wait();
    resultEl.innerHTML = `Record submitted. Confirmed in tx ${txLink(receipt.hash)}`;
    showBanner("Emission record submitted.", "ok");
    e.target.reset();
    $("hashPreview").textContent = "No file selected";
    currentReportHash = null;
  } catch (err) {
    console.error(err);
    resultEl.textContent = "";
    showBanner(parseError(err), "error");
  }
});

// ---------------------------------------------------------------------
// Verifier: approve / reject
// ---------------------------------------------------------------------

async function verifyRecord(approved) {
  if (!requireConnection()) return;
  const recordId = $("verifyRecordId").value;
  const resultEl = $("verifyResult");
  if (!recordId) {
    showBanner("Enter a record ID first.", "error");
    return;
  }
  resultEl.textContent = "Submitting transaction…";
  try {
    const tx = await contract.verifyEmissionRecord(recordId, approved);
    await tx.wait();
    resultEl.innerHTML = `Record #${recordId} marked <strong>${approved ? "Verified" : "Rejected"}</strong>. Confirmed in tx ${txLink(tx.hash)}`;
    showBanner(`Record #${recordId} finalised.`, "ok");
  } catch (err) {
    console.error(err);
    resultEl.textContent = "";
    showBanner(parseError(err), "error");
  }
}

$("verifyForm").addEventListener("submit", (e) => { e.preventDefault(); verifyRecord(true); });
$("rejectBtn").addEventListener("click", () => verifyRecord(false));

// ---------------------------------------------------------------------
// Lookup
// ---------------------------------------------------------------------

$("lookupRecordBtn").addEventListener("click", async () => {
  if (!requireConnection()) return;
  const recordId = $("lookupRecordId").value;
  const resultEl = $("lookupResult");
  if (!recordId) { showBanner("Enter a record ID first.", "error"); return; }
  resultEl.innerHTML = "Looking up…";
  try {
    const r = await contract.getRecord(recordId);
    const statusIdx = Number(r.status);
    resultEl.innerHTML = `
      <dl>
        <div class="record-line"><dt>Status</dt><dd><span class="stamp ${STATUS_CLASSES[statusIdx]}">${STATUS_LABELS[statusIdx]}</span></dd></div>
        <div class="record-line"><dt>Facility ID</dt><dd>${r.facilityId}</dd></div>
        <div class="record-line"><dt>Report hash</dt><dd>${r.reportHash}</dd></div>
        <div class="record-line"><dt>Reporting period</dt><dd>${fromUnix(r.reportingPeriodStart)} → ${fromUnix(r.reportingPeriodEnd)}</dd></div>
        <div class="record-line"><dt>Submitted by</dt><dd>${r.submittedBy}</dd></div>
        <div class="record-line"><dt>Submitted at</dt><dd>${fromUnix(r.submittedAt)}</dd></div>
        <div class="record-line"><dt>Verified by</dt><dd>${statusIdx === 0 ? "—" : r.verifiedBy}</dd></div>
        <div class="record-line"><dt>Verified at</dt><dd>${statusIdx === 0 ? "—" : fromUnix(r.verifiedAt)}</dd></div>
      </dl>`;
  } catch (err) {
    console.error(err);
    resultEl.textContent = "";
    showBanner(parseError(err), "error");
  }
});

$("lookupFacilityBtn").addEventListener("click", async () => {
  if (!requireConnection()) return;
  const facilityId = $("lookupFacilityId").value;
  const resultEl = $("lookupResult");
  if (!facilityId) { showBanner("Enter a facility ID first.", "error"); return; }
  resultEl.innerHTML = "Looking up…";
  try {
    const f = await contract.getFacility(facilityId);
    resultEl.innerHTML = `
      <dl>
        <div class="record-line"><dt>Name</dt><dd>${f.name}</dd></div>
        <div class="record-line"><dt>Registered</dt><dd>${f.registered ? "Yes" : "No"}</dd></div>
        <div class="record-line"><dt>Submitter wallet</dt><dd>${f.submitter}</dd></div>
        <div class="record-line"><dt>Registered at</dt><dd>${fromUnix(f.registeredAt)}</dd></div>
      </dl>`;
  } catch (err) {
    console.error(err);
    resultEl.textContent = "";
    showBanner(parseError(err), "error");
  }
});

// ---------------------------------------------------------------------
// Error formatting
// ---------------------------------------------------------------------

function parseError(err) {
  const raw = err?.reason || err?.shortMessage || err?.message || "Transaction failed.";
  return raw.replace("execution reverted: ", "");
}

// ---------------------------------------------------------------------
// Init
// ---------------------------------------------------------------------

$("connectBtn").addEventListener("click", connectWallet);

if (window.ethereum) {
  window.ethereum.on?.("accountsChanged", () => window.location.reload());
  window.ethereum.on?.("chainChanged", () => window.location.reload());
}