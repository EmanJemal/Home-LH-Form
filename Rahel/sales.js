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
    <td><input type="text" placeholder="Name" /></td>
    <td><input type="text" class="width" placeholder="Room ዝርዝር" /></td>
    <td><input type="text" placeholder="Room ብዛት" /></td>
    <td><input type="text" placeholder="U/P" /></td>
    <td><input type="text" placeholder="T/P" /></td>
    <td><input type="text" placeholder="Food" /></td>
    <td><input type="number" placeholder="Amount" /></td>
    <td><input type="text" placeholder="Drink" /></td>
    <td><input type="number" placeholder="Amount" /></td>
    <td><input type="text" placeholder="Event Type" /></td>
    <td><input type="number" placeholder="Amount" /></td>
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
    if (inputs.length === 12) {
      const entry = {
        date: inputs[0].value,
        Name: inputs[1].value,
        room_ዝርዝር: inputs[2].value,
        room_ብዛት: inputs[3].value,
        u_p: inputs[4].value,
        t_p: inputs[5].value,
        food: inputs[6].value,
        foodAmount: parseInt(inputs[7].value) || 0,
        drink: inputs[8].value,
        drinkAmount: parseInt(inputs[9].value) || 0,
        Event_Type: inputs[10].value,
        Event_amount: parseInt(inputs[11].value) || 0,
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
        Name: ${entry.Name || '-'} (${entry.foodAmount || 0})<br>
        room_ዝርዝር: ${entry.room_ዝርዝር || '-'} (${entry.foodAmount || 0})<br>
        room_ብዛት: ${entry.room_ብዛት || '-'} (${entry.foodAmount || 0})<br>
        U/P: ${entry.u_p || '-'} (${entry.foodAmount || 0})<br>
        T/P: ${entry.t_p || '-'} (${entry.foodAmount || 0})<br>
        Food: ${entry.food || '-'} (${entry.foodAmount || 0})<br>
        Drink: ${entry.drink || '-'} (${entry.drinkAmount || 0})<br>
        Event_Type: ${entry.Event_Type || '-'} (${entry.Event_amount || 0})<br>
\      </div><hr>`;
  });

  receiptContent.innerHTML = receiptHTML || 'No entries to show.';
  receiptModal.style.display = 'block';
});

closeModal.addEventListener('click', () => {
  receiptModal.style.display = 'none';
  window.location.reload();
});


document.getElementById('submit-btn').addEventListener('click', async () => {

  const entry = {
    date: document.getElementById('event-date').value,
    Name: document.getElementById('event-name').value,
    people_ብዛት: document.getElementById('event-people').value,
    u_p: document.getElementById('event-up').value,
    t_p: document.getElementById('event-tp').value,
    food: document.getElementById('event-food').value,
    foodAmount: parseInt(document.getElementById('event-foodamt').value) || 0,
    drinkAmount: 0,
    Event_Type: document.getElementById('event-name').value,
    Event_amount: parseInt(document.getElementById('event-tp').value) || 0,
  };

  try {
    const entryRef = push(ref(database, `Daily_Orders/Event`));
    await set(entryRef, entry);
    alert("Event submitted successfully!");
    window.location.reload();
  } catch (error) {
    console.error("Error submitting event:", error);
    alert("Failed to submit event.");
  }
});

async function loadExistingOrders() {
  const snapshot = await get(ref(database, 'Daily_Orders'));
  const data = snapshot.val();

  if (!data) return;

  for (const title in data) {
    if (title.startsWith('__meta')) continue; // Skip meta titles

    const orderList = Object.entries(data[title]);

    const orderEntries = Object.entries(data[title])
      .filter(([key, _]) => !key.startsWith('__meta'))
      .map(([_, value]) => value);

    const metaKeys = Object.keys(data[title]).filter(k => k.startsWith('__meta'));
    const metas = metaKeys.map(key => ({ key, ...data[title][key] }));

    let totalUP = 0, totalTP = 0, totalFoodAmount = 0, totalDrinkAmount = 0, totalEventAmount = 0;

    const rowsHTML = orderList
      .filter(([key]) => !key.startsWith('__meta')) // exclude meta from table rows
      .map(([_, entry]) => {
        totalUP += parseFloat(entry.u_p || 0);
        totalTP += parseFloat(entry.t_p || 0);
        totalFoodAmount += parseFloat(entry.foodAmount || 0);
        totalDrinkAmount += parseFloat(entry.drinkAmount || 0);
        totalEventAmount += parseFloat(entry.Event_amount || 0);

        return `
          <tr>
            <td>${entry.date || ''}</td>
            <td>${entry.Name || ''}</td>
            <td>${entry.room_ዝርዝር || ''}</td>
            <td>${entry.room_ብዛት || ''}</td>
            <td>${entry.u_p || ''}</td>
            <td>${entry.t_p || ''}</td>
            <td>${entry.food || ''}</td>
            <td>${entry.foodAmount || 0}</td>
            <td>${entry.drink || ''}</td>
            <td>${entry.drinkAmount || 0}</td>
            <td>${entry.Event_Type || ''}</td>
            <td>${entry.Event_amount || 0}</td>
          </tr>
        `;
      }).join('');

    // Calculate total amount from metas
    const totalMetaAmount = metas.reduce((sum, m) => sum + parseFloat(m.amount || 0), 0);

    // Calculate Left Price
    const totalPrice = totalTP + totalFoodAmount + totalDrinkAmount + totalEventAmount;
    const leftPrice = totalPrice - totalMetaAmount;

    // Prepare meta display HTML
    const metaDisplayHTML = metas.length > 0
      ? `<div class="meta-info" style="margin-bottom: 10px;">
          <strong>Saved Payments:</strong>
          <ul>
            ${metas.map(m => `<li>${m.key}: ${m.amount || 0} (Saved at: ${new Date(m.savedAt).toLocaleString()})</li>`).join('')}
          </ul>
        </div>`
      : `<div class="meta-info" style="margin-bottom: 10px;">No saved payments yet.</div>`;

    // Left price display
    const leftPriceHTML = `<div class="left-price" style="font-weight: bold; margin-bottom: 15px;">
      Left Price: ${leftPrice.toFixed(2)}
    </div>`;

    const wrapper = document.createElement('div');
    wrapper.className = 'container';
    wrapper.innerHTML = `
      <h2>${title}
        <button id="export-${title}" style="margin-left: 20px; margin-top: 8px;" class="export">Export to Excel</button>    
      </h2>
      <table>
        <thead>
          <tr>
            <th>Date</th>
            <th>Name</th>
            <th>room_ዝርዝር</th>
            <th>room_ብዛት</th>
            <th>U/P</th>
            <th>T/P</th>
            <th>Food</th>
            <th>Amount</th>
            <th>Drink</th>
            <th>Amount</th>
            <th>Event_Type</th>
            <th>Amount</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHTML}
          <tr><td colspan="12"><hr></td></tr>
          <tr>
            <td colspan="4" style="text-align:left; font-size: 20px; font-weight: bold;">TOTAL = ${totalPrice}</td>
            <td style=" font-size: 20px;font-weight: bold;">${totalUP.toFixed(2)}</td>
            <td style=" font-size: 20px;font-weight: bold;">${totalTP.toFixed(2)}</td>
            <td></td>
            <td style=" font-size: 20px;font-weight: bold;">${totalFoodAmount.toFixed(2)}</td>
            <td></td>
            <td style=" font-size: 20px;font-weight: bold;">${totalDrinkAmount.toFixed(2)}</td>
            <td></td>
            <td style=" font-size: 20px;font-weight: bold;">${totalEventAmount.toFixed(2)}</td>
          </tr>
        </tbody>
      </table>

      ${metaDisplayHTML}
      ${leftPriceHTML}

      <div class="div">
        <input type="text" placeholder="Amount" class="amount-id name-customer" />
        <input type="text" placeholder="Screenshot Id" class="screenshotId name-customer" />
        <input type="text" placeholder="Screenshot Id" class="screenshotId name-customer" />
        <input type="text" placeholder="Screenshot Id" class="screenshotId name-customer" />
      </div>
      <div class="buttons-existing">
        <button class="save-btn-existing" id="saveBtn-existing">Save</button>
      </div>
    `;

    // Save button logic (with correct meta key creation)
    setTimeout(() => {
      const saveBtn = wrapper.querySelector('#saveBtn-existing');
      if (saveBtn) {
        saveBtn.addEventListener('click', async () => {
          const amountInput = wrapper.querySelector('.amount-id');
          const screenshotInputs = wrapper.querySelectorAll('.screenshotId');

          const amountValue = amountInput.value.trim();
          const screenshotIds = Array.from(screenshotInputs).map(input => input.value.trim()).filter(val => val !== '');

          if (!amountValue && screenshotIds.length === 0) {
            alert("Please enter an amount or at least one Screenshot ID.");
            return;
          }

          try {
            let metaIndex = 1;
            let metaKey = '__meta__';

            while (data[title][metaKey]) {
              metaIndex++;
              metaKey = `__meta${metaIndex}__`;
            }

            await set(ref(database, `Daily_Orders/${title}/${metaKey}`), {
              savedAt: new Date().toISOString(),
              amount: amountValue,
              screenshotIds: screenshotIds
            });

            alert("Saved successfully!");
            window.location.reload();
          } catch (error) {
            console.error("Error saving data:", error);
            alert("Failed to save. Check console for error.");
          }
        });
      }
    }, 0);

    existingOrdersContainer.appendChild(wrapper);

    // Export button logic (unchanged)
    setTimeout(() => {
      const exportBtn = document.getElementById(`export-${title}`);
      if (exportBtn) {
        exportBtn.addEventListener('click', () => {
          const header = [
            "Date", "Name", "room_ዝርዝር", "room_ብዛት", "U/P", "T/P",
            "Food", "Amount", "Drink", "Amount", "Event Type", "Amount"
          ];
    
          const metaPayments = [];
          let totalMeta = 0;
    
          const rows = orderList
            .filter(([key]) => !key.startsWith('__meta'))
            .map(([_, entry]) => [
              entry.date || '',
              entry.Name || '',
              entry.room_ዝርዝር || '',
              entry.room_ብዛት || '',
              entry.u_p || '',
              entry.t_p || '',
              entry.food || '',
              entry.foodAmount || 0,
              entry.drink || '',
              entry.drinkAmount || 0,
              entry.Event_Type || '',
              entry.Event_amount || 0
            ]);

          // Collect meta payments

          orderList
            .filter(([key]) => key.startsWith('__meta'))
            .forEach(([key, val], idx) => {
              const metaName = idx === 0 ? "ክፈያ_1" : `ክፈያ_ ${idx + 1}`;
              metaPayments.push([metaName, parseFloat(val.amount || 0).toFixed(2)]);
              totalMeta += parseFloat(val.amount || 0);
            });

          const totalPayment = totalTP + totalFoodAmount + totalDrinkAmount + totalEventAmount;
          const leftToPay = (totalPayment - totalMeta).toFixed(2);

          const totalRow = [
            "TOTAL", "", "", "",
            totalUP.toFixed(2), totalTP.toFixed(2),
            "", totalFoodAmount.toFixed(2),
            "", totalDrinkAmount.toFixed(2),
            "", totalEventAmount.toFixed(2)
          ];

          const today = new Date().toLocaleDateString('en-GB'); // Format dd/mm/yyyy

          const allData = [
            [`${title} By Home Land Hotel`], // Header title
            header,                          // Column headers
            ...rows,                         // Data rows
            totalRow,                        // Totals row
            [],                              // Spacer row
            ["Payments Made"],               // Meta payment title
            ...metaPayments,                 // Meta payment rows
            ["በአጠቃላይ መከፈል ያለበት", totalPayment.toFixed(2)],
            ["እስካሁን በአጠቃላይ የተከፈለ", totalMeta.toFixed(2)],
            ["ቀሪ", leftToPay],
            [],                              // Spacer
            [`ቀን (Date): ${today}`],
            [],                              // Spacer
            [`Rahel: __________________`, `${title}: __________________`]
          ];
          
    
          const worksheet = XLSX.utils.aoa_to_sheet(allData);
    
          // Cell styling
          const borderStyle = {
            top: { style: "thin" },
            bottom: { style: "thin" },
            left: { style: "thin" },
            right: { style: "thin" }
          };
    
          const cellStyle = {
            font: { sz: 12 },
            border: borderStyle
          };
    
          const headerStyle = {
            font: { bold: true, sz: 14 },
            border: borderStyle
          };
    
          const totalStyle = {
            font: { bold: true, sz: 12 },
            border: borderStyle
          };
    
          const titleStyle = {
            font: { bold: true, sz: 18 },
          };
    
          const range = XLSX.utils.decode_range(worksheet['!ref']);
          const dateRowIndex = allData.length - 3;
          const signatureRowIndex = allData.length - 1;

          for (let R = range.s.r; R <= range.e.r; ++R) {
            for (let C = range.s.c; C <= range.e.c; ++C) {
              const cellAddr = XLSX.utils.encode_cell({ r: R, c: C });
              if (!worksheet[cellAddr]) continue;
          
              // Skip styling for date and signature rows
              if (R === dateRowIndex || R === signatureRowIndex) {
                continue;
              }
          
              if (R === 0) {
                worksheet[cellAddr].s = titleStyle;
              } else if (R === 1) {
                worksheet[cellAddr].s = headerStyle;
              } else if (R === rows.length + 2) {
                worksheet[cellAddr].s = totalStyle;
              } else {
                worksheet[cellAddr].s = cellStyle;
              }
            }
          }
          
    
          const workbook = XLSX.utils.book_new();
          XLSX.utils.book_append_sheet(workbook, worksheet, title);
          XLSX.writeFile(workbook, `${title}-orders.xlsx`);
        });
      }
    }, 0);
    

  }
}


loadExistingOrders();


// 🛠 Make "Cancel" button in removeCustomerModal close the popup
document.querySelector('cancelRemoveBtn').addEventListener('click', () => {
  document.getElementById('removeCustomerModal').style.display = 'none';
});
