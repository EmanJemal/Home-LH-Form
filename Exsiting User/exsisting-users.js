import { database, ref, set, get, update, remove, onValue, child, push } from '../Script/firebase.js';
/*
const data = localStorage.getItem('Entering Pin');
if(data != 45284270810258310208532513043010152410200935993930){
 document.body.innerHTML = '<h1>You are not allowed</h1>'
}*/

// Reference to the database
const dbRef = ref(database);

const listContainer = document.querySelector('.listids');

get(child(dbRef, 'timer_id_ver')).then(async snapshot => {
  if (snapshot.exists()) {
    const data = snapshot.val();

    // Extract and sort the latest 4 by time
    const entries = Object.entries(data)
      .map(([id, info]) => ({
        id,
        time: info.time || 0,
        salesname: info.salesname
      }))
      .sort((a, b) => b.time - a.time)
      .slice(0, 4);

    // Convert timestamps to Gregorian dates (YYYY-MM-DD)
    const gcDates = entries.map(entry => {
      const date = new Date(entry.time);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    });

    // Fetch Ethiopian equivalents using API
    const queryParams = gcDates.map(date => `gc[]=${date}`).join('&');
    const apiUrl = `https://api.ethioall.com/convert/api?${queryParams}`;

    const response = await fetch(apiUrl);
    const ecData = await response.json();

    // Render output
    listContainer.innerHTML = entries.map((entry, index) => {
      const ec = ecData[index];
      const dateStr = `${ec.day} ${ec.month_name.amharic} ${ec.year} (${ec.day_name.amharic})`;
      return `<i class="fa-solid fa-user-tie"></i><span><div><strong>ID:</strong> ${entry.id}<i class="fa-solid fa-arrow-right fa-arrow-margin"></i><strong>ቀን:</strong> ${dateStr}<i class="fa-solid fa-arrow-right fa-arrow-margin"></i>${entry.salesname}</div><hr/><span>`;
    }).join('');

  } else {
    listContainer.innerHTML = '<p>ምንም መረጃ አልተገኘም።</p>';
  }
}).catch(error => {
  console.error(error);
  listContainer.innerHTML = '<p>ይቅርታ፣ መረጃ ማስመዝገብ አልተቻለም።</p>';
});

// Function to load customers into their respective floors and rooms
function loadCustomers() {
    Promise.all([
        get(child(dbRef, 'customers')),
        get(child(dbRef, 'organisation_room'))
    ])
    .then(([snapshot, orgSnapshot]) => {
            if (snapshot.exists() || orgSnapshot.exists()) {
                // Clear existing room data
                document.querySelectorAll('.floors-div .floors ul').forEach(ul => ul.innerHTML = '');

                snapshot.forEach((childSnapshot) => {


                    
                    const customer = childSnapshot.val();
                    const roomNumber = customer.selectedRoom;
                    const customerId_edit = customer.customerId;
                    const phone = customer.phone;
                    const days = customer.days;
                    const finalDate = customer.finalDate;
                    const timeid = customer.timeid;
                    const salesname = customer.salesname;
                    const startingDate = customer.timestamp;
                    const paymentMethod = customer.paymentMethod;
                    const customerName = customer.name;
                    const amt = customer.amountInBirr;
                    const customerId = childSnapshot.key; // Get the customer ID
                
                    let formattedDate = 'N/A';
                    let exittime = 'N/A';
                
                    // 🗓️ Validate and Process `finalDate`
                    if (finalDate && finalDate.includes('T')) {
                        const [date, time] = finalDate.split('T');
                        const [year, month, day] = date.split('-');
                
                        //console.log({ year, month, day, time });
                
                        // 🕒 Validate and Process `startingDate`
                        if (startingDate && startingDate.includes(' at ')) {
                            try {
                                const [datePart, timePart] = startingDate.split(' at ');
                
                                const exitDate = new Date(datePart);
                
                                const exitYear = exitDate.getFullYear();
                                const exitMonth = String(exitDate.getMonth() + 1).padStart(2, '0');
                                const exitDay = String(exitDate.getDate()).padStart(2, '0');
                
                                const [hours, minutes, seconds] = timePart.split(':');
                                const hour12 = parseInt(hours, 10) % 12 || 12;
                                const ampm = parseInt(hours, 10) >= 12 ? 'PM' : 'AM';
                                const formattedExitTime = `${hour12}:${minutes} ${ampm}`;
                
                                // 📊 Calculate Exit Time Difference
                                const currentDate = new Date(`${year}-${month}-${day}T${time}`);
                                const timeDiff = currentDate - exitDate;
                
                                const diffDays = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
                                const diffMonths = Math.floor(diffDays / 30); // Approximate month difference
                                const remainingDays = diffDays % 30;
                



                                
                                exittime = `${diffMonths} month(s), ${remainingDays} day(s), ${formattedExitTime}`;
                                formattedDate = `${month}-${day} <i class="fa-solid fa-arrow-right"></i> ${time}`;
                
                                /*console.log({
                                    exitYear,
                                    exitMonth,
                                    exitDay,
                                    exittime,
                                    formattedDate
                                });*/
                
                            } catch (error) {
                                console.error('Error processing startingDate:', error.message);
                            }
                        } else {
                            console.error('Invalid or missing startingDate');
                        }
                    } else {
                        console.error('Invalid or missing finalDate');
                    }
                
                    // 🏢 Determine Floor Based on Room Number
                    let floor;
                    if (roomNumber.startsWith('1')) floor = '.floors .floor-one ul';
                    else if (roomNumber.startsWith('2')) floor = '.floors .floor-two ul';
                    else if (roomNumber.startsWith('3')) floor = '.floors .floor-three ul';
                    else if (roomNumber.startsWith('4')) floor = '.floors .floor-four ul';
                
                    const floorElement = document.querySelector(floor);
                
                    if (floorElement) {
                        const listItem = document.createElement('li');
                        listItem.innerHTML = `
                            ${roomNumber} <i class="fa-solid fa-arrow-right"></i> ${customerName}
                            <i class="fa-solid fa-arrow-right"></i> ${paymentMethod}
                            <i class="fa-solid fa-arrow-right fa-arrow-margin"></i>
                            <span class="starting-date">${startingDate}</span>
                            <i class="fa-solid fa-arrow-right fa-arrow-margin"></i>
                            <span class="ending-date">${amt} Birr</span>
                            <span class="user-leaved"><i class="fa-solid fa-user-xmark"></i></span>
                            <i class="fa-solid fa-arrow-right fa-arrow-margin"></i><span style="color:red;">${days}  DAYS</span>
                        `;
                        floorElement.appendChild(listItem);
                        const editBtn = document.createElement('button');
                        editBtn.textContent = 'Edit';
                        editBtn.classList.add('edit-btn');
                        editBtn.addEventListener('click', () => {
                            openEditModal(customerId, {
                                name: customerName,
                                room: roomNumber,
                                days: days,
                                paymentMethod: paymentMethod,
                                startDate: startingDate,
                                timeid: timeid,
                                amount: amt,
                                salesname: salesname,
                                phone: phone,
                                customerId_edit: customerId_edit
                            });
                        });
                        listItem.appendChild(editBtn);

                
                        // 🛎️ Event Listener for Removing User
                        listItem.querySelector('.user-leaved').addEventListener('click', () => {
                            showRemovePopup(customerId, roomNumber);
                        });
                    } else {
                        console.warn(`No floor found for room number: ${roomNumber}`);
                    }
                });

                
                orgSnapshot.forEach((childSnapshot) => {
                    const customer = childSnapshot.val();
                   // console.log(childSnapshot.val())
                    const roomNumber = customer.bookings;
                    const startingDate = customer.startDate;
                    const finalDate = customer.endDate;
                    const orgName = customer.name;
                    const customerName = customer.name;
                    const timeid = customer.timeid;



                    for (let index = 0; index < roomNumber.length; index++) {
                            const element = roomNumber[index];
                            //console.log(element.room)
                            const days = customer.days;
                            const paymentMethod = customer.paymentMethod;
                            const customerId = childSnapshot.key; // Get the customer ID
        
                       // 🏢 Determine Floor BastartingDatesed on Room Number
                            let floor;
                            if (element.room.startsWith('1')) floor = '.floors .floor-one ul';
                            else if (element.room.startsWith('2')) floor = '.floors .floor-two ul';
                            else if (element.room.startsWith('3')) floor = '.floors .floor-three ul';
                            else if (element.room.startsWith('4')) floor = '.floors .floor-four ul';

                            const floorElement = document.querySelector(floor);
                        
                            if (floorElement) {
                                const listItem = document.createElement('li');
                                listItem.innerHTML = `
                                    <p class="organisation-name">${orgName}</p>
                                    ${element.room} <i class="fa-solid fa-arrow-right"></i> ${element.name}
                                    <i class="fa-solid fa-arrow-right fa-arrow-margin"></i>
                                    <span class="starting-date">${startingDate}</span>
                                    <i class="fa-solid fa-arrow-right fa-arrow-margin"></i>
                                    <span class="ending-date">${finalDate}</span>
                                    <i class="fa-solid fa-arrow-right fa-arrow-margin"></i>
                                    <span class="user-leaved org-leaved"><i class="fa-solid fa-user-xmark"></i></span>
                                `;
                                floorElement.appendChild(listItem);
                                const editBtn = document.createElement('button');
                                editBtn.textContent = 'Edit';
                                editBtn.classList.add('edit-btn');
                                editBtn.addEventListener('click', () => {
                                    openEditModal(customerId, {
                                        name: customerName,
                                        room: roomNumber,
                                        days: days,
                                        paymentMethod: paymentMethod,
                                        startDate: startingDate,
                                        timeid: timeid,
                                        amount: amt,
                                    });
                                });
                                listItem.appendChild(editBtn);

                        
                                // 🛎️ Event Listener for Removing User
                                listItem.querySelector('.org-leaved').addEventListener('click', () => {
                                    showRemovePopupORG(orgName, element.room, element.name);
                                });

                            } else {
                                console.warn(`No floor found for room number: ${element.room}`);
                            }


                }


                });
                
                
            } else {
                console.log('No customers found.');
            }
        })
        .catch((error) => {
            console.error('Error fetching customers:', error);
        });
}

let currentEditId = null;

function openEditModal(id, customerData) {
    currentEditId = id;

    document.getElementById('editName').value = customerData.name;
    document.getElementById('editRoom').value = customerData.room;
    document.getElementById('phone').value = customerData.phone;
    document.getElementById('editDays').value = customerData.days;
    document.getElementById('editPayment').value = customerData.paymentMethod.toLowerCase();
    document.getElementById('editStart').value = customerData.startDate;
    document.getElementById('timerId').value = customerData.timeid || '';
    document.getElementById('salesname').value = customerData.salesname || '';
    document.getElementById('customerId').value = customerData.customerId_edit;
    document.getElementById('editAmount').value = customerData.amount;
    document.getElementById('editNewAmount').value = '';
    document.getElementById('editReason').value = '';

    document.getElementById('editCustomerModal').style.display = 'block';
}

function closeEditModal() {
    document.getElementById('editCustomerModal').style.display = 'none';
    currentEditId = null;
}


// Function to show the popup for password input
function showRemovePopup(customerId, roomNumber) {
    const modal = document.getElementById('removeCustomerModal');
    modal.style.display = 'block';

    // Confirm remove action
    document.getElementById('confirmRemoveBtn').onclick = () => {
        const password = document.getElementById('passwordInput').value;

        if (password === '151584') {
            removeCustomer(customerId, roomNumber); // Pass roomNumber here
            modal.style.display = 'none'; // Close the popup
        } else {
            alert('Incorrect password. Please try again.');
        }
    };

    // Close the popup when cancel button is clicked
    document.getElementById('cancelRemoveBtn').onclick = () => {
        modal.style.display = 'none';
    };
}



// Function to remove the customer and their booked room
function removeCustomer(customerId, roomNumber) {
    // Reference to the customer and the room
    const customerRef = ref(database, 'customers/' + customerId);
    const roomRef = ref(database, 'rooms/' + roomNumber); // Reference to the room

    // Remove the room only once (after the customer is successfully removed)
    remove(customerRef)
        .then(() => {
            return remove(roomRef);  // Remove the room after the customer
        })
        .then(() => {
            console.log('Room and customer removed successfully');
            loadCustomers();  // Reload the customer list after removal
        })
        .catch((error) => {
            console.error('Error removing customer or room:', error);
        });
}





// Load customers on page load
window.onload = loadCustomers;

document.getElementById('submitEditBtn').addEventListener('click', async () => {
    if (!currentEditId) return;

    const updatedData = {
        name: document.getElementById('editName').value,
        selectedRoom: document.getElementById('editRoom').value,
        days: document.getElementById('editDays').value,
        paymentMethod: document.getElementById('editPayment').value,
        timestamp: document.getElementById('editStart').value,
        timeid: document.getElementById('timerId').value,
    };

    // Show/hide reason field if amount is changed
    const newAmountInput = document.getElementById('editNewAmount');
    const reasonLabel = document.getElementById('reasonLabel');
    const reasonInput = document.getElementById('editReason');

    newAmountInput.addEventListener('input', () => {
        const originalAmount = parseFloat(document.getElementById('editAmount').value);
        const newAmount = parseFloat(newAmountInput.value);

        if (!isNaN(newAmount) && newAmount !== originalAmount) {
            reasonLabel.style.display = 'block';
            reasonInput.style.display = 'block';
        } else {
            reasonLabel.style.display = 'none';
            reasonInput.style.display = 'none';
        }
    });

    const originalAmount = parseFloat(document.getElementById('editAmount').value);
    const newAmount = parseFloat(document.getElementById('editNewAmount').value);
    const reason = document.getElementById('editReason').value;

    const hasAmountChanged = !isNaN(newAmount) && newAmount !== originalAmount;

    if (hasAmountChanged && !reason) {
        alert('Please provide a reason for changing the amount.');
        return;
    }

    if (hasAmountChanged) {
        updatedData.amountInBirr = newAmount;
        updatedData.amountChangeReason = reason;
    } else {
        updatedData.amountInBirr = originalAmount;
    }
    
    try {
        // Update both /customers and /Payments
        const updates = {};
        updates[`customers/${currentEditId}`] = updatedData;
        updates[`Payments/${currentEditId}`] = updatedData;

        await update(ref(database), updates);
        alert('Customer info updated successfully.');
        closeEditModal();
        loadCustomers(); // Refresh
    } catch (error) {
        console.error('Error updating customer:', error);
        alert('Error saving changes.');
    }
});



// Function to show the popup for password input
function showRemovePopupORG(customerId, roomNumber, name) {
    const modal = document.getElementById('removeCustomerModal');
    modal.style.display = 'block';

    // Confirm remove action
    document.getElementById('confirmRemoveBtn').onclick = () => {
        const password = document.getElementById('passwordInput').value;

        if (password === '151584') {
            removeCustomerORG(customerId, roomNumber, name); // Pass roomNumber here
            modal.style.display = 'none'; // Close the popup
        } else {
            alert('Incorrect password. Please try again.');
        }
    };

    // Close the popup when cancel button is clicked
    document.getElementById('cancelRemoveBtn').onclick = () => {
        modal.style.display = 'none';
    };
}



const showBTNTimer = document.querySelector(".showBTNTimer");


showBTNTimer.addEventListener('click', () => {
  const modal = document.getElementById('removeCustomerModal');
  modal.style.display = 'block';

  document.getElementById('confirmRemoveBtn').onclick = async () => {
    const password = document.getElementById('passwordInput').value;
    const timerId = prompt("Enter the 5-digit Timer ID:");
    if (!timerId) return alert("Timer ID is required.");
    if (password !== '151584') return alert("Incorrect password.");

    modal.style.display = 'none';

    // Fetch Payments
    const paymentsSnap = await get(child(ref(database), 'Payments'));
    const inOutSnap = await get(child(ref(database), 'in_out'));

    let total = { Cash: 0, Telebirr: 0, CBE: 0, Dube: 0 };
    let activeInOutTotals = { Cash: 0, Telebirr: 0, CBE: 0, Dube: 0 };
    const allData = [];

    // 1️⃣ Process Payments for this timerId
    if (paymentsSnap.exists()) {
      paymentsSnap.forEach(snap => {
        const val = snap.val();
        if (val.timeid === timerId && !isNaN(parseFloat(val.amountInBirr))) {
          const amt = parseFloat(val.amountInBirr);
          const method = (val.paymentMethod || '').toLowerCase();
          if (method.includes("cash")) total.Cash += amt;
          else if (method.includes("telebirr")) total.Telebirr += amt;
          else if (method.includes("cbe")) total.CBE += amt;
          else if (method.includes("debtors") || method.includes("dube")) total.Dube += amt;

          allData.push({
            Name: val.name || "N/A",
            Room: val.selectedRoom || "N/A",
            Amount: amt + ' Birr',
            Method: val.paymentMethod || "N/A",
            phone: val.phone || "N/A",
            salesname: val.salesname || "N/A"
          });
        }
      });
    }

    // 2️⃣ Process active in_out entries
    if (inOutSnap.exists()) {
      const inOutData = inOutSnap.val();
      Object.values(inOutData).forEach(dateGroup => {
        Object.values(dateGroup).forEach(entry => {
          if (entry.status === 'active' && !isNaN(entry.amount)) {
            const amt = entry.amount;
            const method = (entry.paymentMethod || '').toLowerCase();
            const sign = (entry.type === 'in') ? 1 : -1;
            const signedAmount = sign * amt;

            if (method.includes("cash")) activeInOutTotals.Cash += signedAmount;
            else if (method.includes("telebirr")) activeInOutTotals.Telebirr += signedAmount;
            else if (method.includes("cbe")) activeInOutTotals.CBE += signedAmount;
            else if (method.includes("debtors") || method.includes("dube")) activeInOutTotals.Dube += signedAmount;
          }
        });
      });
    }

    // 3️⃣ Combine totals
    const finalTotals = {
      Cash: total.Cash + activeInOutTotals.Cash,
      Telebirr: total.Telebirr + activeInOutTotals.Telebirr,
      CBE: total.CBE + activeInOutTotals.CBE,
      Dube: total.Dube + activeInOutTotals.Dube
    };


    // 🔁 Build all active in_out entries as formatted rows
let inOutDetailsHTML = '<div><h2>Active In/Out</h2></div>';
Object.values(inOutSnap.val() || {}).forEach(dateGroup => {
  Object.values(dateGroup).forEach(entry => {
    if (entry.status === 'active' && !isNaN(entry.amount)) {
      const amount = (entry.type === 'out' ? '-' : '+') + entry.amount + ' Birr';
      inOutDetailsHTML += `
        <div class="cash">
          ${entry.reason || 'N/A'} --- ${entry.type} --- ${amount}
        </div>
      `;
    }
  });
});

    // 4️⃣ Display result
    const containerDiv = document.querySelector('.daily-amount');
    containerDiv.innerHTML = `
    ${inOutDetailsHTML}
    <div class="cash"><h1>Final Cash</h1><h2>${finalTotals.Cash} Birr</h2></div>
    <div class="cash"><h1>Final Telebirr</h1><h2>${finalTotals.Telebirr} Birr</h2></div>
    <div class="cash"><h1>Final CBE</h1><h2>${finalTotals.CBE} Birr</h2></div>
    <div class="cash"><h1>Final Dube</h1><h2>${finalTotals.Dube} Birr</h2></div>
    <div class="cash"><h1>Total</h1><h2>${finalTotals.Cash + finalTotals.Telebirr + finalTotals.CBE + finalTotals.Dube} Birr</h2></div>
    <button id="downloadExcel">📥 Download Excel</button>
    <button id="downloadWord">📄 Download Word</button>
  `;
  
  document.getElementById("downloadExcel").addEventListener("click", () => {
    const dataForExcel = [...allData];
  
    // 🔁 Gather all active in_out records
    const activeInOutRows = [];
    Object.values(inOutSnap.val() || {}).forEach(dateGroup => {
      Object.values(dateGroup).forEach(entry => {
        if (entry.status === 'active' && !isNaN(entry.amount)) {
          activeInOutRows.push({
            Name: entry.reason || 'N/A',
            Room: entry.type,
            Amount: (entry.type === 'out' ? '-' : '+') + entry.amount,
          });
        }
      });
    });
  
    const uniqueRooms = new Set();
    allData.forEach(item => {
      if (item.Room && item.Room !== "N/A") {
        uniqueRooms.add(item.Room);
      }
    });
  
    const final = finalTotals;
  
    // 🧾 Prepare additional rows
    const extraRows = [
      {}, // blank
      { Name: `Total Rooms Booked: ${uniqueRooms.size}` },
      { Name: `Total Cash`, Room: `${final.Cash} Birr` },
      { Name: `Total Telebirr`, Room: `${final.Telebirr} Birr` },
      { Name: `Total CBE`, Room: `${final.CBE} Birr` },
      { Name: `Total Dube`, Room: `${final.Dube} Birr` },
      {}, // blank
      { Name: 'Previous Sales', Room: '_______' },
      { Name: 'Next Sales', Room: '_______' }
    ];
  
    // Combine data
    dataForExcel.push({});
    dataForExcel.push(...activeInOutRows);
    dataForExcel.push(...extraRows);
  
    const worksheet = XLSX.utils.json_to_sheet(dataForExcel);
  
    // Set column widths
    worksheet['!cols'] = [
      { wch: 22 }, // Name
      { wch: 20 }, // Room
      { wch: 15 }, // Amount
      { wch: 15 }, // Method
      { wch: 25 }, // Phone
      { wch: 20 }, // Salesname
    ];
  
    const range = XLSX.utils.decode_range(worksheet['!ref']);
  
    const lastRow = dataForExcel.length - 1;
    const totalStartRow = dataForExcel.length - extraRows.length;
    const totalRowsToHighlight = [
      totalStartRow + 1, // Cash
      totalStartRow + 2, // Telebirr
      totalStartRow + 3, // CBE
      totalStartRow + 4  // Dube
    ];

    const boldRows = [
      dataForExcel.length - 2, // Previous Sales
      dataForExcel.length - 1  // Next Sales
    ];
    
    for (let R = range.s.r; R <= range.e.r; ++R) {
      for (let C = range.s.c; C <= range.e.c; ++C) {
        const cellRef = XLSX.utils.encode_cell({ r: R, c: C });
        const cell = worksheet[cellRef];
        if (!cell) continue;
    
        const isTitleRow = R === 0;
        const isBoldExtra = boldRows.includes(R);
        const isTotalRow = totalRowsToHighlight.includes(R);
    
        const style = {
          font: {
            sz: isTitleRow || isBoldExtra || isTotalRow ? 15 : 12,
            bold: isTitleRow || isBoldExtra || isTotalRow,
          },
          alignment: {
            horizontal: "left",
          },
          fill: isTotalRow
            ? { fgColor: { rgb: "C9DAF8" } } // 💙 light blue background for totals
            : undefined,
          border: {
            top: { style: "thin", color: { rgb: "000000" } },
            bottom: { style: "thin", color: { rgb: "000000" } },
            left: { style: "thin", color: { rgb: "000000" } },
            right: { style: "thin", color: { rgb: "000000" } },
          },
        };
    
        cell.s = style;
      }
    }
    
  
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Timer Report');
  
    const today = new Date();
    const fileName = `timer_${timerId}_report_${today.getFullYear()}_${today.getMonth() + 1}_${today.getDate()}.xlsx`;
    XLSX.writeFile(workbook, fileName);
    
  });
  
  
  };
});

const showBTNtaju = document.querySelector(".show-btn-taju");

showBTNtaju.addEventListener('click', () => {
  const modal = document.getElementById('removeCustomerModal');
  modal.style.display = 'block';

  document.getElementById('confirmRemoveBtn').onclick = async () => {
    const password = document.getElementById('passwordInput').value;
    const timerInput = prompt("Enter one or more Timer IDs, separated by commas:");

    if (!timerInput) return alert("At least one Timer ID is required.");
    const timerIds = timerInput.split(",").map(id => id.trim()).filter(Boolean);
    if (timerIds.length === 0) return alert("No valid Timer IDs provided.");

    if (password !== '018769') {
      alert('Incorrect password.');
      return;
    }

    modal.style.display = 'none';
    const paymentsSnap = await get(child(ref(database), 'Payments'));
    const inOutSnap = await get(child(ref(database), 'in_out'));

    let total = { Cash: 0, Telebirr: 0, CBE: 0, Dube: 0 };
    let activeInOutTotals = { Cash: 0, Telebirr: 0, CBE: 0, Dube: 0 };
    const allData = [];

    if (paymentsSnap.exists()) {
      paymentsSnap.forEach((snap) => {
        const val = snap.val();
        const amount = parseFloat(val.amountInBirr);
        const phone = val.phone;
        const method = val.paymentMethod?.toLowerCase();

        if (timerIds.includes(val.timeid) && !isNaN(amount)) {
          if (method.includes("cash")) total.Cash += amount;
          else if (method.includes("telebirr")) total.Telebirr += amount;
          else if (method.includes("cbe")) total.CBE += amount;
          else if (method.includes("debtors") || method.includes("dube")) total.Dube += amount;

          allData.push({
            Name: val.name || "N/A",
            Room: val.selectedRoom || "N/A",
            Amount: amount + ' Birr',
            Method: val.paymentMethod || "N/A",
            phone: phone,
            salesname: val.salesname || "N/A",
          });
        }
      });
    }

    if (inOutSnap.exists()) {
      const inOutData = inOutSnap.val();
      Object.values(inOutData).forEach(dateGroup => {
        Object.values(dateGroup).forEach(entry => {
          if (entry.status === 'active' && !isNaN(entry.amount)) {
            const amt = entry.amount;
            const method = (entry.paymentMethod || '').toLowerCase();
            const sign = (entry.type === 'in') ? 1 : -1;
            const signedAmount = sign * amt;

            if (method.includes("cash")) activeInOutTotals.Cash += signedAmount;
            else if (method.includes("telebirr")) activeInOutTotals.Telebirr += signedAmount;
            else if (method.includes("cbe")) activeInOutTotals.CBE += signedAmount;
            else if (method.includes("debtors") || method.includes("dube")) activeInOutTotals.Dube += signedAmount;
          }
        });
      });
    }

    const finalTotals = {
      Cash: total.Cash + activeInOutTotals.Cash,
      Telebirr: total.Telebirr + activeInOutTotals.Telebirr,
      CBE: total.CBE + activeInOutTotals.CBE,
      Dube: total.Dube + activeInOutTotals.Dube
    };

    const containerDiv = document.querySelector('.daily-amount');
// Build active in_out entry list
let inOutDetailsHTML = '<div><h2>Active In/Out</h2></div>';
Object.values(inOutSnap.val() || {}).forEach(dateGroup => {
  Object.values(dateGroup).forEach(entry => {
    if (entry.status === 'active' && !isNaN(entry.amount)) {
      const amount = (entry.type === 'out' ? '-' : '+') + entry.amount + ' Birr';
      inOutDetailsHTML += `
        <div class="cash">
          ${entry.reason || 'N/A'} --- ${entry.type} --- ${amount}
        </div>
      `;
    }
  });
});

containerDiv.innerHTML = `
  ${inOutDetailsHTML}
  <div class="cash"><h1>Cash</h1><h2>${finalTotals.Cash} Birr</h2></div>
  <div class="cash"><h1>Telebirr</h1><h2>${finalTotals.Telebirr} Birr</h2></div>
  <div class="cash"><h1>CBE</h1><h2>${finalTotals.CBE} Birr</h2></div>
  <div class="cash"><h1>Dube</h1><h2>${finalTotals.Dube} Birr</h2></div>
  <button id="downloadExcel">📥 Download Excel</button>
  <button id="downloadWord">📄 Download Word</button>
`;

    

    document.getElementById("downloadExcel").addEventListener("click", async () => {
      // Step 1: Fetch current Ethiopian date
      let ethiopianDateText = '';
      try {
        const res = await fetch('https://date.ethioall.com/api/date');
        const data = await res.json();
        ethiopianDateText = `${data.day} ${data.date} ${data.month} ${data.year}`;
      } catch (e) {
        console.warn('Could not fetch Ethiopian date:', e);
        ethiopianDateText = 'N/A';
      }
    
      // Step 2: Prepare headers and payment data
      const titleRow = ["Home Land Hotel"]; // Title
      const dateRow = [`የኢትዮጵያ ቀን፡ ${ethiopianDateText}`];
      const headers = [["Name", "Room", "Amount", "Method", "Phone", "Sales Name"]];
      const paymentRows = allData.map(item => ([
        item.Name || '',
        item.Room || '',
        item.Amount || '',
        item.Method || '',
        item.phone || '',
        item.salesname || ''
      ]));
    
      // Step 3: Totals Row
      const uniqueRooms = new Set();
      // 🔁 Gather all active in_out records
const activeInOutRows = [];
Object.values(inOutSnap.val() || {}).forEach(dateGroup => {
  Object.values(dateGroup).forEach(entry => {
    if (entry.status === 'active' && !isNaN(entry.amount)) {
      const amount = (entry.type === 'out' ? '-' : '+') + entry.amount + ' Birr';
      activeInOutRows.push([
        entry.reason || 'N/A',
        entry.type,
        amount,
        entry.paymentMethod || '',
        '',
        ''
      ]);
    }
  });
});

      const final = finalTotals;
      allData.forEach(item => {
        if (item.Room && item.Room !== "N/A") {
          uniqueRooms.add(item.Room);
        }
      });
      const totalRoomsBooked = uniqueRooms.size;
  
      const totalRow = [
        [`Total Rooms Booked: ${totalRoomsBooked}`, "", "", "", "", ""],
        [`Total Cash: ${final.Cash} Birr`, "", "", "", "", ""],
        [`Total Telebirr: ${final.Telebirr} Birr`, "", "", "", "", ""],
        [`Total CBE: ${final.CBE} Birr`, "", "", "", "", ""],
        [`Total Dube: ${final.Dube} Birr`, "", "", "", "", ""]
      ];
      
      
    
      // Step 4: Signature rows
      const emptyRow = [""];
      const signatureRow = ["Signature (Taju): __________________", "", "", "Signature (Sales): __________________"];
    
      // Step 5: Create worksheet
      const wb = XLSX.utils.book_new();
      const wsData = [
        titleRow,
        dateRow,
        [],
        ...headers,
        ...paymentRows,
        [],
        ["Active In/Out Records"],
        ...activeInOutRows,
        [],
        ...totalRow,
        [],
        signatureRow
      ];
      
      const ws = XLSX.utils.aoa_to_sheet(wsData);
    
      const range = XLSX.utils.decode_range(ws['!ref']);
    
      // Step 6: Apply styles
      // Title row styling
      const titleCell = XLSX.utils.encode_cell({ r: 0, c: 0 });
      ws[titleCell].s = {
        font: { name: "Arial", sz: 24, bold: true },
        alignment: { horizontal: "center", vertical: "center" }
      };
      ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 5 } }]; // Merge title
    
      // Ethiopian date styling
      const dateCell = XLSX.utils.encode_cell({ r: 1, c: 0 });
      ws[dateCell].s = {
        font: { name: "Arial", sz: 14, italic: true },
        alignment: { horizontal: "left" }
      };
      ws['!merges'].push({ s: { r: 1, c: 0 }, e: { r: 1, c: 5 } }); // Merge date
    
      // Header row styling
      const headerStartRow = 3;
      for (let C = 0; C < headers[0].length; ++C) {
        const cell = XLSX.utils.encode_cell({ r: headerStartRow, c: C });
        if (ws[cell]) {
          ws[cell].s = {
            font: { bold: true },
            alignment: { horizontal: "center" },
            fill: { fgColor: { rgb: "FFD966" } }
          };
        }
      }
    
      // Totals row styling
      const totalRowIndex = headerStartRow + paymentRows.length + 2;
      for (let R = 0; R < totalRow.length; ++R) {
        const cell = XLSX.utils.encode_cell({ r: totalRowIndex + R, c: 0 });
        if (ws[cell]) {
          ws[cell].s = {
            font: { bold: true },
            alignment: { horizontal: "left" },
          };
        }
      }
      
    
      // Signatures row styling
      const signatureRowIndex = totalRowIndex + 2;
      for (let C = 0; C < signatureRow.length; ++C) {
        const cell = XLSX.utils.encode_cell({ r: signatureRowIndex, c: C });
        if (ws[cell]) {
          ws[cell].s = {
            font: { italic: true },
            alignment: { horizontal: "left" }
          };
        }
      }
    
      // Step 7: Save file
      XLSX.utils.book_append_sheet(wb, ws, "Final Report");
      XLSX.writeFile(wb, `Home_Land_Hotel_Report_${new Date().toISOString().slice(0, 10)}.xlsx`);
    });
    
    

    

};
});


function normalizeKey(name) {
  return name.toLowerCase().replace(/\s+/g, '_');
}

function removeCustomerORG(orgKey, roomNumber, bookingName) {
  const normalizedKey = normalizeKey(bookingName);
  const orgRef = ref(database, `organisation_room/${orgKey}`);

  console.log("📍 Checking path: organisation_room/" + orgKey);

  get(orgRef)
    .then((snapshot) => {
      if (!snapshot.exists()) throw new Error("Organisation does not exist.");

      const orgData = snapshot.val();
      const bookings = Array.isArray(orgData.bookings) ? orgData.bookings : [];
      const updatedBookings = bookings.filter(
        (b) => b.room !== roomNumber || b.name !== bookingName
      );

      const bookedRooms = Array.isArray(orgData.bookedRooms) ? orgData.bookedRooms : [];
      const updatedBookedRooms = bookedRooms.filter((room) => room !== roomNumber);

      return update(orgRef, {
        bookings: updatedBookings,
        bookedRooms: updatedBookedRooms
      });
    })
    .then(() => {
      console.log('✅ Room and booking removed successfully');
      loadCustomers();
    })
    .catch((error) => {
      console.error('❌ Failed to remove booking:', error.message);
    });
}


document.getElementById('exportExcelBtn').addEventListener('click', async () => {
  const customerSnapshot = await get(child(ref(database), 'customers'));
  const orgSnapshot = await get(child(ref(database), 'organisation_room'));

  const allData = [];

  if (customerSnapshot.exists()) {
    customerSnapshot.forEach((childSnap) => {
      const c = childSnap.val();
      allData.push({
        Name: c.name,
        Room: c.selectedRoom,
        Days: c.days,
        Payment: c.paymentMethod,
        Start: c.timestamp,
        End: c.finalDate,
      });
    });
  }

  if (orgSnapshot.exists()) {
    orgSnapshot.forEach((childSnapshot) => {
      const orgKey = childSnapshot.key;
      const customer = childSnapshot.val();

      if (customer.bookings && Array.isArray(customer.bookings)) {
        customer.bookings.forEach((booking) => {
          allData.push({
            Name: booking.name,
            Room: booking.room,
            Days: booking.days,
            Payment: booking.paymentMethod || '',
            Start: booking.startDate || '',
            End: booking.endDate || ''
          });
        });
      }
    });
  }

  if (allData.length === 0) {
    alert("No customer data found to export.");
    return;
  }

  // Header row manually defined
  const header = ["Name", "Room", "Days", "Payment", "Start", "End"];
  const rows = allData.map(obj => [obj.Name, obj.Room, obj.Days, obj.Payment, obj.Start, obj.End]);

  const finalData = [header, ...rows];

  const worksheet = XLSX.utils.aoa_to_sheet(finalData);
  worksheet['!cols'] = [
    { wch: 20 }, // Name
    { wch: 10 }, // Room
    { wch: 8 },  // Days
    { wch: 12 }, // Payment
    { wch: 18 }, // Start
    { wch: 18 }  // End
  ];
  
  // Apply styles
  const borderStyle = {
    top: { style: "thin" },
    bottom: { style: "thin" },
    left: { style: "thin" },
    right: { style: "thin" }
  };

  const headerStyle = {
    font: { bold: true, sz: 18 },
    border: borderStyle
  };

  const bodyStyle = {
    font: { sz: 15 },
    border: borderStyle
  };

  const range = XLSX.utils.decode_range(worksheet['!ref']);
  for (let R = range.s.r; R <= range.e.r; ++R) {
    for (let C = range.s.c; C <= range.e.c; ++C) {
      const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
      if (!worksheet[cellAddress]) continue;

      worksheet[cellAddress].s = R === 0 ? headerStyle : bodyStyle;
    }
  }

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Customers');

  XLSX.writeFile(workbook, 'All_Customers.xlsx');

});

