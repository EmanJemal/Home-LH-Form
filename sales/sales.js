import { getDatabase, database, ref, set, get, update, remove, onValue, child, push } from '../Script/firebase.js';
import { auth, onAuthStateChanged } from '../Script/firebase.js';
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";

onAuthStateChanged(auth, (user) => {
  if (!user) {
    // 🚨 Not authenticated, redirect to login page
    window.location.href = '../log-in/loginpage.html';
  } else {
    console.log('✅ Authenticated as:', user.uid);
    // continue as normal...
  }
});
document.getElementById('submit-btn').addEventListener('click', () => {
    const modal = document.getElementById('removeCustomerModal');
    modal.style.display = 'block';

    // Collect values
    const room = document.querySelector('.room-lable input').value || '0';
    const restaurant = document.querySelector('.Restaurant-lable input').value || '0';
    const dube = document.querySelector('.dube-lable input').value || '0';
    const prepaid = document.querySelector('.prepaid-lable input').value || 'None';
    const voided = document.querySelector('.void-lable input').value || '0';

    // Fill preview modal (optional)
    document.querySelector('.information-customer .name').innerHTML = `Room: ${room}`;
    document.querySelector('.information-customer .age').innerHTML = `Restaurant: ${restaurant}`;
    document.querySelector('.information-customer .date-of-birth').innerHTML = `Dube: ${dube}`;
    document.querySelector('.information-customer .final-date').innerHTML = `Prepaid: ${prepaid}`;
    document.querySelector('.information-customer .payment-method').innerHTML = `Void: ${voided}`;
    document.querySelector('.information-customer .room').innerHTML = '';
    document.querySelector('.information-customer .Price').innerHTML = '';
});

document.getElementById('confirmRemoveBtn').addEventListener('click', () => {
    const room = document.querySelector('.room-lable input').value || '0';
    const restaurant = document.querySelector('.Restaurant-lable input').value || '0';
    const dube = document.querySelector('.dube-lable input').value || '0';
    const prepaid = document.querySelector('.prepaid-lable input').value || 'None';
    const voided = document.querySelector('.void-lable input').value || '0';

    // Format today's date as YYYY-MM-DD
    const today = new Date();
    const dateStr = today.toISOString().split('T')[0]; // e.g., 2025-07-16

    const data = {
        room: parseFloat(room),
        restaurant: parseFloat(restaurant),
        dube: parseFloat(dube),
        prepaid,
        void: parseFloat(voided),
        timestamp: new Date().toLocaleString('en-GB', { timeZone: 'Africa/Addis_Ababa' })
    };

    const cashRegisterRef = ref(database, `cashregister/${dateStr}`);
    const newEntryRef = push(cashRegisterRef); // create unique ID under today

    set(newEntryRef, data)
        .then(() => {
            alert('Saved to cash register!');
            document.getElementById('removeCustomerModal').style.display = 'none';
            clearInputs();
        })
        .catch(err => {
            console.error('Error saving:', err);
            alert('Error saving data.');
        });
});

function clearInputs() {
    document.querySelectorAll('input').forEach(input => input.value = '');
}




const addRowBtn = document.getElementById('addRowBtn');
const saveBtn = document.getElementById('saveBtn');
const tableBody = document.getElementById('table-body');
const receiptModal = document.getElementById('receiptModal');
const receiptContent = document.getElementById('receiptContent');
const closeModal = document.getElementById('closeModal');
const dailyTitleInput = document.getElementById('dailyTitle');
const existingOrdersContainer = document.getElementById('existing-orders');

addRowBtn.addEventListener('click', () => {
  const row = document.createElement('tr');
  row.innerHTML = `
    <td><input type="date" /></td>
    <td><input type="text" placeholder="Food" /></td>
    <td><input type="number" placeholder="Amount" /></td>
    <td><input type="text" placeholder="Drink" /></td>
    <td><input type="number" placeholder="Amount" /></td>
    <td><input type="text" placeholder="Hot Drink" /></td>
    <td><input type="number" placeholder="Amount" /></td>
    <td><input type="text" placeholder="Room" /></td>
  `;
  tableBody.appendChild(row);
});

saveBtn.addEventListener('click', async () => {
  const title = dailyTitleInput.value.trim();
  if (!title) {
    alert("Please enter a title before saving.");
    return;
  }

  const rows = tableBody.querySelectorAll('tr');
  const entries = [];

  for (const row of rows) {
    const inputs = row.querySelectorAll('input');
    if (inputs.length === 8) {
      const entry = {
        date: inputs[0].value,
        food: inputs[1].value,
        foodAmount: parseInt(inputs[2].value) || 0,
        drink: inputs[3].value,
        drinkAmount: parseInt(inputs[4].value) || 0,
        hotDrink: inputs[5].value,
        hotAmount: parseInt(inputs[6].value) || 0,
        room: inputs[7].value,
      };

      entries.push(entry);

      const entryRef = push(ref(database, `Daily_Orders/${title}`));
      await set(entryRef, entry);
    }
  }

  // Show receipt
  let receiptHTML = '';
  entries.forEach((entry, index) => {
    receiptHTML += `
      <div style="margin-bottom: 15px;">
        <strong>Order ${index + 1}</strong><br>
        Date: ${entry.date || '-'}<br>
        Food: ${entry.food || '-'} (${entry.foodAmount || 0})<br>
        Drink: ${entry.drink || '-'} (${entry.drinkAmount || 0})<br>
        Hot Drink: ${entry.hotDrink || '-'} (${entry.hotAmount || 0})<br>
        Room: ${entry.room || '-'}
      </div><hr>`;
  });

  receiptContent.innerHTML = receiptHTML || 'No entries to show.';
  receiptModal.style.display = 'block';
});

closeModal.addEventListener('click', () => {
  receiptModal.style.display = 'none';
  window.location.reload();
});

// Fetch and display existing Daily Orders
async function loadExistingOrders() {
  const snapshot = await get(ref(database, 'Daily_Orders'));
  const data = snapshot.val();

  if (!data) return;

  for (const title in data) {
    const orderList = Object.values(data[title]).reverse(); // Recent first

    const wrapper = document.createElement('div');
    wrapper.className = 'container';
    wrapper.innerHTML = `
      <h2>${title}</h2>
      <table>
        <thead>
          <tr>
            <th>Date</th>
            <th>Food</th>
            <th>Amount</th>
            <th>Drink</th>
            <th>Amount</th>
            <th>Hot Drink</th>
            <th>Amount</th>
            <th>Room</th>
          </tr>
        </thead>
        <tbody>
          ${orderList.map(entry => `
            <tr>
              <td>${entry.date || ''}</td>
              <td>${entry.food || ''}</td>
              <td>${entry.foodAmount || 0}</td>
              <td>${entry.drink || ''}</td>
              <td>${entry.drinkAmount || 0}</td>
              <td>${entry.hotDrink || ''}</td>
              <td>${entry.hotAmount || 0}</td>
              <td>${entry.room || ''}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
    existingOrdersContainer.appendChild(wrapper);
  }
}

loadExistingOrders();


// 🛠 Make "Cancel" button in removeCustomerModal close the popup
document.querySelector('cancelRemoveBtn').addEventListener('click', () => {
  document.getElementById('removeCustomerModal').style.display = 'none';
});
