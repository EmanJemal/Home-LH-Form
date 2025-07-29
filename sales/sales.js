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

async function submitExcelData() {
  const rows = document.querySelectorAll('#excelRows tr');
  const data = [];

  rows.forEach(row => {
    const inputs = row.querySelectorAll('input');
    const rowData = {
      category: inputs[0].value.trim(),
      description: inputs[1].value.trim(),
      date: inputs[2].value.trim(),
      uom: inputs[3].value.trim(),
      quantity: parseFloat(inputs[4].value) || 0,
      unitPrice: parseFloat(inputs[5].value) || 0,
      totalPrice: parseFloat(inputs[6].value) || 0,
      add: parseFloat(inputs[7].value) || 0,
      discount: parseFloat(inputs[8].value) || 0,
      tax: parseFloat(inputs[9].value) || 0,
      grandPrice: parseFloat(inputs[10].value) || 0
    };

    if (rowData.category || rowData.quantity > 0 || rowData.totalPrice > 0) {
      data.push(rowData);
    }
  });

  if (data.length === 0) {
    alert("No valid data to submit.");
    return;
  }

  try {
    const savePromises = data.map(row => {
      const cleanDate = row.date || new Date().toISOString().split('T')[0];
      const excelRef = ref(database, `excel_register/${cleanDate}`);
      const newRef = push(excelRef);
      return set(newRef, row);
    });

    await Promise.all(savePromises);
    alert("✅ All Excel-style sales saved by their input dates!");

    document.querySelectorAll('#excelRows input').forEach(input => input.value = '');

    loadExcelEntries(); // Optionally reload today's data

  } catch (error) {
    console.error("❌ Error saving to Firebase:", error);
    alert("Failed to save data.");
  }
}



document.getElementById('submitExcelBtn').addEventListener('click', submitExcelData);

let groupedData = {};
let finalTotalPrice = 0;
let finalAdd = 0;
let finalTax = 0;
let finalGrand = 0;


async function loadExcelEntries() {
  const displayContainer = document.getElementById('excel-display');
  displayContainer.innerHTML = ''; // Clear previous content

  const dateInput = document.getElementById('excelDate').value;
  const selectedDate = dateInput || new Date().toISOString().split('T')[0]; // fallback to today
  const snapshot = await get(ref(database, `excel_register/${selectedDate}`));
  
  const data = snapshot.val();

  if (!data) {
    displayContainer.innerHTML = '<p>No Excel data saved for today.</p>';
    return;
  }
  groupedData = {};
  finalTotalPrice = 0;
  finalAdd = 0;
  finalTax = 0;
  finalGrand = 0;
  
  // Group by category
  Object.values(data).forEach(entry => {
    const cat = entry.category || 'Unknown';
    if (!groupedData[cat]) groupedData[cat] = [];
    groupedData[cat].push(entry);    
  
  });


  

  // Create Excel-style table for each category
  for (const category in groupedData) {
    const rows = groupedData[category];

    let totalPriceSum = 0;
    let addSum = 0;
    let taxSum = 0;
    let grandSum = 0;

    const table = document.createElement('table');
    table.className = 'excel-table';

    const rowHtml = rows.map(row => {
      const totalPrice = parseFloat(row.totalPrice || 0);
      const add = parseFloat(row.add || 0);
      const tax = parseFloat(row.tax || 0);
      const grand = parseFloat(row.grandPrice || 0);

      totalPriceSum += totalPrice;
      addSum += add;
      taxSum += tax;
      grandSum += grand;

      return `
        <tr>
          <td>${row.date || ''}</td>
          <td>${row.description || ''}</td>
          <td>${row.uom || ''}</td>
          <td>${row.quantity || 0}</td>
          <td>${row.unitPrice || 0}</td>
          <td>${totalPrice.toFixed(2)}</td>
          <td>${add.toFixed(2)}</td>
          <td>${tax.toFixed(2)}</td>
          <td>${grand.toFixed(2)}</td>
        </tr>
      `;
    }).join('');

    // Add to grand totals
    finalTotalPrice += totalPriceSum;
    finalAdd += addSum;
    finalTax += taxSum;
    finalGrand += grandSum;

    table.innerHTML = `
      <thead>
        <tr><th colspan="8" style="text-align:left;">📦 Category: ${category}</th></tr>
        <tr>
          <th>Date</th>
          <th>Description</th>
          <th>UOM</th>
          <th>Qty</th>
          <th>Unit Price</th>
          <th>Total Price</th>
          <th>Add (Service)</th>
          <th>Tax</th>
          <th>Grand Total</th>
        </tr>
      </thead>
      <tbody>
        ${rowHtml}
        <tr>
      
          <td colspan="5" style="text-align:right;"><strong>Subtotal for ${category}:</strong></td>
          <td><strong>${totalPriceSum.toFixed(2)}</strong></td>
          <td><strong>${addSum.toFixed(2)}</strong></td>
          <td><strong>${taxSum.toFixed(2)}</strong></td>
          <td><strong>${grandSum.toFixed(2)}</strong></td>
        </tr>
      </tbody>
    `;
    displayContainer.appendChild(table);
  }

  // Add final summary table
// Add vertical column-style summary (bottom-right)
const finalBox = document.createElement('div');
finalBox.style.float = 'right';
finalBox.style.width = '250px';
finalBox.style.border = '2px solid #fc6b13';
finalBox.style.padding = '15px';
finalBox.style.marginTop = '30px';
finalBox.style.borderRadius = '10px';
finalBox.style.backgroundColor = '#fff8f0';
finalBox.innerHTML = `
  <h3 style="color: #fc6b13; margin-bottom: 10px;">📊 Grand Totals</h3>
  <p><strong>Total Before Tax:</strong> ${finalTotalPrice.toFixed(2)}</p>
  <p><strong>Total Add (Service):</strong> ${finalAdd.toFixed(2)}</p>
  <p><strong>Total Tax:</strong> ${finalTax.toFixed(2)}</p>
  <p><strong>Grand Total:</strong> ${finalGrand.toFixed(2)}</p>
`;
displayContainer.appendChild(finalBox);

}


loadExcelEntries();

// 🛠 Make "Cancel" button in removeCustomerModal close the popup
document.getElementById('cancelRemoveBtn').addEventListener('click', () => {
  document.getElementById('removeCustomerModal').style.display = 'none';
});

document.getElementById('exportExcelBtn-excel').addEventListener('click', () => {
  const wb = XLSX.utils.book_new();
  const wsData = [];

  // Add a styled heading row
  wsData.push(["Daily Excel Export"]);

  // Leave one row gap
  wsData.push([]);

  for (const cat in groupedData) {
    wsData.push([`Category of: ${cat}`]);
    wsData.push([
      "Date", "Description", "UOM", "Qty", "Unit Price", "Total", "Add", "Discount", "Tax", "Grand Total"
    ]);

    groupedData[cat].forEach(entry => {
      wsData.push([
        entry.date || '',
        entry.description || '',  // Optional if you use it
        entry.uom || '',
        entry.quantity || '',
        entry.unitPrice || '',
        entry.totalPrice || '',
        entry.add || '',
        entry.discount || '',
        entry.tax || '',
        entry.grandPrice || ''
      ]);
    });

    // Add a subtotal row
    const subtotal = groupedData[cat].reduce(
      (acc, row) => {
        acc.totalPrice += parseFloat(row.totalPrice || 0);
        acc.add += parseFloat(row.add || 0);
        acc.tax += parseFloat(row.tax || 0);
        acc.grandPrice += parseFloat(row.grandPrice || 0);
        return acc;
      },
      { totalPrice: 0, add: 0, tax: 0, grandPrice: 0 }
    );

    wsData.push([
      "", "Subtotal", "", "", "", 
      subtotal.totalPrice.toFixed(2),
      subtotal.add.toFixed(2),
      "",
      subtotal.tax.toFixed(2),
      subtotal.grandPrice.toFixed(2)
    ]);

    wsData.push([]); // space before next category
  }

  // Add vertical column-style summary
  wsData.push([]);
  wsData.push(["📊 Summary"]);
  wsData.push(["Total Before Tax", finalTotalPrice.toFixed(2)]);
  wsData.push(["Total Add (Service)", finalAdd.toFixed(2)]);
  wsData.push(["Total Tax", finalTax.toFixed(2)]);
  wsData.push(["Grand Total", finalGrand.toFixed(2)]);

  const ws = XLSX.utils.aoa_to_sheet(wsData);

  // Apply styling
  const range = XLSX.utils.decode_range(ws['!ref']);
  for (let R = 0; R <= range.e.r; ++R) {
    for (let C = 0; C <= range.e.c; ++C) {
      const cellRef = XLSX.utils.encode_cell({ r: R, c: C });
      if (!ws[cellRef]) continue;

      const isHeader = wsData[R][0]?.startsWith("Category of:") || wsData[R][0] === "📊 Summary" || R === 0;

      ws[cellRef].s = {
        font: {
          name: "Poppins",
          sz: 12,
          bold: isHeader
        },
        alignment: {
          vertical: "center",
          horizontal: "center"
        },
        border: {
          top: { style: "thin", color: { rgb: "AAAAAA" } },
          bottom: { style: "thin", color: { rgb: "AAAAAA" } },
          left: { style: "thin", color: { rgb: "AAAAAA" } },
          right: { style: "thin", color: { rgb: "AAAAAA" } }
        },
        fill: isHeader
          ? { fgColor: { rgb: "FFF3E0" } }
          : undefined
      };
    }
  }

  XLSX.utils.book_append_sheet(wb, ws, "Sales Summary");
  XLSX.writeFile(wb, `Daily_Sales_${new Date().toISOString().split('T')[0]}.xlsx`);
});

document.getElementById('loadExcelBtn').addEventListener('click', () => {
  loadExcelEntries();
});
