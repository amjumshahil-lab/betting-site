/* ========================================
   COIN PREDICTION — Supabase Auth + Wallet
   ======================================== */

let currentUser = null;

// ---------- Auth ----------
async function initAuth() {
  const { data } = await supabase.auth.getSession();
  currentUser = data.session ? data.session.user : null;
  updateAuthUI();

  supabase.auth.onAuthStateChange((event, session) => {
    currentUser = session ? session.user : null;
    updateAuthUI();
  });
}

function updateAuthUI() {
  const navActions = document.querySelector('.nav-actions');
  if (!navActions) return;

  // Remove old buttons if any
  const oldBtns = navActions.querySelectorAll('.auth-btn');
  oldBtns.forEach(b => b.remove());

  if (currentUser) {
    // Logged in: show user email + Logout, hide Login/Register
    const userBtn = document.createElement('button');
    userBtn.type = 'button';
    userBtn.className = 'nav-btn auth-btn';
    userBtn.textContent = currentUser.email || 'Account';
    userBtn.style.background = 'var(--surface-elev)';
    userBtn.style.color = 'var(--text)';
    userBtn.style.border = '1px solid var(--border)';
    userBtn.style.borderRadius = '8px';
    userBtn.style.padding = '8px 16px';
    userBtn.style.fontSize = '0.9rem';
    userBtn.style.fontWeight = '500';
    userBtn.onclick = signOut;

    const sep = document.createTextNode('  ');

    navActions.appendChild(sep);
    navActions.appendChild(userBtn);

    // Hide original Login/Register links
    const links = navActions.querySelectorAll('a.nav-btn');
    links.forEach(l => l.style.display = 'none');
  } else {
    // Logged out: show Login with Google + Register with Google
    const links = navActions.querySelectorAll('a.nav-btn');
    links.forEach(l => l.style.display = '');

    const googleLogin = document.createElement('button');
    googleLogin.type = 'button';
    googleLogin.className = 'nav-btn auth-btn';
    googleLogin.textContent = 'Login with Google';
    googleLogin.style.background = 'var(--surface-elev)';
    googleLogin.style.color = 'var(--text)';
    googleLogin.style.border = '1px solid var(--border)';
    googleLogin.style.borderRadius = '8px';
    googleLogin.style.padding = '8px 16px';
    googleLogin.style.fontSize = '0.85rem';
    googleLogin.style.fontWeight = '500';
    googleLogin.style.marginLeft = '10px';
    googleLogin.onclick = () => signInWithGoogle();

    navActions.appendChild(googleLogin);
  }
}

async function signInWithGoogle() {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: window.location.origin + window.location.pathname
    }
  });
  if (error) alert(error.message);
}

async function signOut() {
  await supabase.auth.signOut();
  currentUser = null;
  updateAuthUI();
  window.location.href = 'index.html';
}

// ---------- Wallet / Balance ----------
let balance = 0;

const fmt = (n) => new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
}).format(n);

async function updateBalance() {
  const els = document.querySelectorAll("#balanceValue, #availBalance");
  if (els.length === 0) return;

  if (currentUser) {
    const { data, error } = await supabase
      .from('profiles')
      .select('balance')
      .eq('id', currentUser.id)
      .single();

    if (!error && data) {
      balance = Number(data.balance) || 0;
    } else {
      balance = 0;
    }
  } else {
    balance = 0;
  }

  els.forEach((el) => {
    el.textContent = fmt(balance);
  });
}

// ---------- Transactions (demo fallback) ----------
const demoTx = [
  { name: "Deposit", time: "2 hours ago", amount: 5000, type: "credit" },
  { name: "Withdraw", time: "5 hours ago", amount: -1200, type: "debit" },
  { name: "Deposit", time: "1 day ago", amount: 2000, type: "credit" },
];

function renderTransactions() {
  const list = document.getElementById("txList");
  if (!list) return;
  list.innerHTML = demoTx.map((tx) => {
    const sign = tx.type === "credit" ? "+" : "-";
    return `
      <div class="tx-item">
        <div class="tx-meta">
          <div class="tx-name">${tx.name}</div>
          <div class="tx-time">${tx.time}</div>
        </div>
        <div class="tx-amount ${tx.type}">${sign}${fmt(Math.abs(tx.amount))}</div>
      </div>
    `;
  }).join("");
}

// ---------- Require login ----------
function requireLogin() {
  if (!currentUser) {
    alert("Please login with Google to add or withdraw money");
    return false;
  }
  return true;
}

// ---------- Page load ----------
document.addEventListener("DOMContentLoaded", async () => {
  await initAuth();
  await updateBalance();
  renderTransactions();

  // --- Add money ---
  const addModal = document.getElementById("addModal");
  const addBtn = document.getElementById("addMoneyBtn");
  const closeAdd = document.getElementById("closeAddModal");
  const cancelAdd = document.getElementById("cancelAdd");
  const addForm = document.getElementById("addForm");

  function openAdd() { if (addModal) addModal.classList.add("open"); }
  function closeAddModal() { if (addModal) addModal.classList.remove("open"); }

  if (addBtn) addBtn.addEventListener("click", (e) => {
    e.preventDefault();
    if (!requireLogin()) return;
    openAdd();
  });
  if (closeAdd) closeAdd.addEventListener("click", closeAddModal);
  if (cancelAdd) cancelAdd.addEventListener("click", closeAddModal);

  if (addModal) {
    addModal.addEventListener("click", (e) => {
      if (e.target === addModal) closeAddModal();
    });
  }

  if (addForm) {
    addForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (!requireLogin()) return;
      const amt = parseFloat(document.getElementById("addAmount").value);
      if (!isNaN(amt) && amt > 0) {
        // Fetch current balance, then update
        const { data: prof } = await supabase
          .from('profiles')
          .select('balance')
          .eq('id', currentUser.id)
          .single();

        const newBal = (Number(prof?.balance) || 0) + amt;

        const { error } = await supabase
          .from('profiles')
          .update({ balance: newBal })
          .eq('id', currentUser.id);

        if (!error) {
          await updateBalance();
          demoTx.unshift({ name: "Deposit", time: "Just now", amount: amt, type: "credit" });
          renderTransactions();
          addForm.reset();
          closeAddModal();
        } else {
          alert(error.message || "Failed to add money");
        }
      }
    });
  }

  // --- Withdraw money ---
  const wdModal = document.getElementById("withdrawModal");
  const wdBtn = document.getElementById("withdrawMoneyBtn");
  const closeWd = document.getElementById("closeWithdrawModal");
  const cancelWd = document.getElementById("cancelWithdraw");
  const wdForm = document.getElementById("withdrawForm");

  function openWd() { if (wdModal) wdModal.classList.add("open"); }
  function closeWdModal() { if (wdModal) wdModal.classList.remove("open"); }

  if (wdBtn) wdBtn.addEventListener("click", (e) => {
    e.preventDefault();
    if (!requireLogin()) return;
    openWd();
  });
  if (closeWd) closeWd.addEventListener("click", closeWdModal);
  if (cancelWd) cancelWd.addEventListener("click", closeWdModal);

  if (wdModal) {
    wdModal.addEventListener("click", (e) => {
      if (e.target === wdModal) closeWdModal();
    });
  }

  if (wdForm) {
    wdForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (!requireLogin()) return;
      const amt = parseFloat(document.getElementById("withdrawAmount").value);
      if (!isNaN(amt) && amt > 0) {
        // Fetch current balance, then update
        const { data: prof } = await supabase
          .from('profiles')
          .select('balance')
          .eq('id', currentUser.id)
          .single();

        const curBal = Number(prof?.balance) || 0;
        if (amt > curBal) {
          alert("Insufficient balance");
          return;
        }

        const newBal = curBal - amt;

        const { error } = await supabase
          .from('profiles')
          .update({ balance: newBal })
          .eq('id', currentUser.id);

        if (!error) {
          await updateBalance();
          demoTx.unshift({ name: "Withdraw", time: "Just now", amount: amt, type: "debit" });
          renderTransactions();
          wdForm.reset();
          closeWdModal();
        } else {
          alert(error.message || "Failed to withdraw");
        }
      } else if (amt > balance) {
        alert("Insufficient balance");
      }
    });
  }

  // Highlight active bottom nav based on current page
  const page = window.location.pathname.split("/").pop() || "index.html";
  document.querySelectorAll(".bottom-nav .nav-item").forEach((item) => {
    const href = item.getAttribute("href");
    if (href === page) item.classList.add("active");
    else item.classList.remove("active");
  });
});
