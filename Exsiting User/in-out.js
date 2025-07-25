import { database, ref, set, get, update, child, push } from '../Script/firebase.js';

// Reference to the database
const dbRef = ref(database);

async function askPassword() {
  const pwd = prompt("Enter password to proceed:");
  if (pwd !== "018769") {
    alert("❌ Incorrect password. Access denied.");
    throw new Error("Incorrect password");
  }
}

// Set initial date input value on load
window.addEventListener("DOMContentLoaded", () => {
  const dateInput = document.getElementById("in-out-date");
  const today = new Date().toISOString().split("T")[0];
  dateInput.value = today;
});

document.addEventListener('DOMContentLoaded', () => {
  const inOutGrid = document.getElementById("inOutGrid");
  const addRowBtn = document.getElementById("addRowBtn");
  const dateInput = document.getElementById("in-out-date");

  // Row factory
  function createInOutRow() {
    const row = document.createElement("div");
    row.classList.add("in-out-row");
    row.style.display = "grid";
    row.style.gridTemplateColumns = "1fr 1fr 1fr 1fr 1fr 80px";
    row.style.gap = "8px";
    row.innerHTML = `
      <div>
        <label><input type="checkbox" class="method" value="telebirr">Telebirr</label><br>
        <label><input type="checkbox" class="method" value="cbe">CBE</label><br>
        <label><input type="checkbox" class="method" value="cash">Cash</label>
      </div>
      <input type="text" style="width: 350px;" class="reason" placeholder="Reason">
      <label><input type="checkbox" class="flow" value="in">In</label>
      <label><input type="checkbox" class="flow" value="out">Out</label>
      <input type="number" class="amount" placeholder="Amount">
      <button class="saveInOutBtn">💾</button>
    `;

    // Save handler with password check
    row.querySelector(".saveInOutBtn").addEventListener("click", async () => {
      try {
        await askPassword();  // only before saving

        const methods = Array.from(row.querySelectorAll(".method:checked")).map(cb => cb.value);
        const flow = row.querySelector(".flow:checked")?.value;
        const reason = row.querySelector(".reason").value.trim();
        const amount = parseFloat(row.querySelector(".amount").value);

        if (!methods.length || !flow || isNaN(amount)) {
          return alert("❗ Please select a payment method, In/Out, and enter an amount.");
        }

        const today = new Date();
        const datePath = dateInput.value || `${today.getFullYear()}-${today.getMonth()+1}-${today.getDate()}`;

        for (const method of methods) {
          const newRef = push(ref(database, `in_out/${datePath}`));
          await set(newRef, {
            paymentMethod: method,
            type: flow,
            amount,
            reason,
            timestamp: Date.now(),
            status: "" // default empty status
          });
        }

        alert("✅ Saved!");
        row.querySelector(".reason").value = "";
        row.querySelector(".amount").value = "";
        row.querySelectorAll("input[type=checkbox]").forEach(cb => cb.checked = false);

      } catch (err) {
        console.warn(err.message || err);
      }
    });

    return row;
  }

  // Render initial rows
  for (let i = 0; i < 2; i++) {
    inOutGrid.appendChild(createInOutRow());
  }

  // Add Row button
  addRowBtn.addEventListener("click", () => {
    inOutGrid.appendChild(createInOutRow());
  });
});

window.addEventListener('DOMContentLoaded', async () => {
  const inOutGrid = document.getElementById('inOutGrid-display');
  inOutGrid.innerHTML = 'Loading entries...';

  try {
    const snapshot = await get(child(dbRef, 'in_out'));
    inOutGrid.innerHTML = '';

    if (!snapshot.exists()) {
      inOutGrid.innerHTML = '<p>No entries found.</p>';
      return;
    }

    const data = snapshot.val();

    const entries = [];
    Object.entries(data).forEach(([dateKey, entriesObj]) => {
      Object.entries(entriesObj).forEach(([entryId, entry]) => {
        if (entry.status === "delete") return;
        entries.push({ dateKey, entryId, ...entry });
      });
    });

    if (entries.length === 0) {
      inOutGrid.innerHTML = '<p>No entries found.</p>';
      return;
    }

    entries.forEach(entry => {
      const div = document.createElement('div');
      div.className = 'in-out-row';
      div.style.marginBottom = '12px';
      div.style.padding = '8px';
      div.style.border = '1px solid #ccc';
      div.style.borderRadius = '4px';

      div.innerHTML = `
        <div><strong>Date:</strong> ${entry.dateKey}</div>
        <div style="margin-left: -150px; width: 50%;"><strong>Reason:</strong> ${entry.reason}</div>
        <div style="margin-left: -250px; width: 50%;"><strong>Payment Method:</strong> ${entry.paymentMethod}</div>
        <div style="margin-left: -130px;width: 50%;"><strong>Amount:</strong> ${entry.amount}</div>
        <div style="margin-left: -100px;width: 50%;"><strong>In/Out:</strong> ${entry.type}</div>
        <div style="margin-left: -100px;width: 50%;">
          <label>Status: 
            <select class="status-select">
              <option value="">--none--</option>
              <option value="active">active</option>
              <option value="notactive">notactive</option>
              <option value="delete">delete</option>
            </select>
          </label>
        </div>
      `;

      const select = div.querySelector('.status-select');
      select.value = entry.status || '';

      select.addEventListener('change', async (e) => {
        try {
          await askPassword();  // only before update

          const newStatus = e.target.value;
          await update(ref(database, `in_out/${entry.dateKey}/${entry.entryId}`), {
            status: newStatus
          });

          if (newStatus === 'delete') {
            div.remove(); // hide from UI but not DB
            alert('Entry marked as deleted and hidden.');
          } else {
            alert(`Status updated to "${newStatus}"`);
          }

          entry.status = newStatus;
        } catch (err) {
          alert('Action cancelled or failed (wrong password).');
          console.error(err);
          select.value = entry.status || '';
        }
      });

      inOutGrid.appendChild(div);
    });
  } catch (error) {
    inOutGrid.innerHTML = '<p style="color:red;">Failed to load data.</p>';
    console.error('Error fetching data:', error);
  }
});