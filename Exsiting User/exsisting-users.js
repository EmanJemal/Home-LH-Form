import { database, ref, set, get, update, remove, onValue, child, push } from '../Script/firebase.js';
/*
const data = localStorage.getItem('Entering Pin');
if(data != 45284270810258310208532513043010152410200935993930){
 document.body.innerHTML = '<h1>You are not allowed</h1>'
}*/

// Reference to the database
const dbRef = ref(database);

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
                    const days = customer.days;
                    const finalDate = customer.finalDate;
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
                                if (isNaN(exitDate)) {
                                    throw new Error('Invalid startingDate format');
                                }
                
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
                            <i class="fa-solid fa-arrow-right fa-arrow-margin"></i>${days} Days
                            <i class="fa-solid fa-arrow-right"></i> ${paymentMethod}
                            <i class="fa-solid fa-arrow-right fa-arrow-margin"></i>
                            <span class="starting-date">${startingDate}</span>
                            <i class="fa-solid fa-arrow-right fa-arrow-margin"></i>
                            <span class="ending-date">${amt} Birr</span>
                            <span class="user-leaved"><i class="fa-solid fa-user-xmark"></i></span>
                            ${exittime}
                        `;
                        floorElement.appendChild(listItem);
                
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


                    for (let index = 0; index < roomNumber.length; index++) {
                            const element = roomNumber[index];
                            //console.log(element.room)
                            const days = customer.days;
                            const paymentMethod = customer.paymentMethod;
                            const customerId = childSnapshot.key; // Get the customer ID
        
                       // 🏢 Determine Floor Based on Room Number
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


const showBTN = document.querySelector(".show-btn");
function parseCustomDate(dateStr) {
    try {
        const [datePart, timePart] = dateStr.split(' at ');
        if (!datePart || !timePart) {
            console.warn("parseCustomDate: Missing date or time in:", dateStr);
            return null;
        }

        const parsedDate = new Date(`${datePart} ${timePart}`);
        if (isNaN(parsedDate.getTime())) {
            console.warn("parseCustomDate: Could not parse:", dateStr);
            return null;
        }

        return parsedDate;
    } catch (err) {
        console.warn("parseCustomDate error:", err.message, "for", dateStr);
        return null;
    }
}



function convertTo24Hour(timeStr) {
    const [time, modifier] = timeStr.split(' ');
    let [hours, minutes, seconds] = time.split(':');

    hours = parseInt(hours, 10);

    if (modifier === 'PM' && hours < 12) {
        hours += 12;
    } else if (modifier === 'AM' && hours === 12) {
        hours = 0;
    }

    return `${hours.toString().padStart(2, '0')}:${minutes}:${seconds}`;
}


showBTN.addEventListener('click', () => {
    const modal = document.getElementById('removeCustomerModal');
    modal.style.display = 'block';

  
    document.getElementById('confirmRemoveBtn').onclick = async () => {
        const password = document.getElementById('passwordInput').value;

        if (password === '151584') {
            modal.style.display = 'none';

            const containerDiv = document.querySelector('.daily-amount');
            containerDiv.innerHTML = `
                <label for="fromDate">From Date:</label>
                <input type="datetime-local" id="fromDate" />
                <label for="toDate">To Date:</label>
                <input type="datetime-local" id="toDate" />
                <button id="calculate">Calculate</button>
                <div id="results"></div>
            `;

            document.getElementById("calculate").addEventListener("click", async () => {
                const fromInput = document.getElementById("fromDate").value;
                const toInput = document.getElementById("toDate").value;
                const from = new Date(fromInput);
                const to = new Date(toInput);
                
                if (isNaN(from.getTime()) || isNaN(to.getTime())) {
                    alert("Please select a valid date and time range");
                    return;
                }

                const paymentsSnap = await get(child(ref(database), 'Payments'));
                let total = { Cash: 0, Telebirr: 0, CBE: 0, Dube: 0 };

                if (paymentsSnap.exists()) {
                    paymentsSnap.forEach(snap => {
                        const val = snap.val();
                        const rawTimestamp = val.timestamp;
                        const paymentDate = parseCustomDate(rawTimestamp);
                        const paymentMethod = val.paymentMethod?.toLowerCase();
                        const amount = parseFloat(val.amountInBirr);

                        if (
                            paymentDate &&
                            paymentDate.getTime() >= from.getTime() &&
                            paymentDate.getTime() <= to.getTime() &&
                            !isNaN(amount)
                          ) {
                            if (paymentMethod.includes("cash")) total.Cash += amount;
                            else if (paymentMethod.includes("telebirr")) total.Telebirr += amount;
                            else if (paymentMethod.includes("cbe")) total.CBE += amount;
                            else if (paymentMethod.includes("debtors")) total.Dube += amount;
                          } 
                            else {
                                console.warn("Skipping entry due to:");
                                if (!paymentDate) console.warn("Invalid date:", rawTimestamp);
                                else if (isNaN(amount)) console.warn("Invalid amount:", val.amountInBirr);
                                else if (paymentDate.getTime() < from.getTime()) {
                                  console.warn("Date too early:", paymentDate.toISOString(), "<", from.toISOString());
                                }
                                else if (paymentDate.getTime() > to.getTime()) {
                                  console.warn("Date too late:", paymentDate.toISOString(), ">", to.toISOString());
                                }
                              
                                                        }
                          
                    });
                }

                document.getElementById("results").innerHTML = `
                    <div class="cash"><h1>Cash</h1><h2>${total.Cash} Birr</h2></div>
                    <div class="cash"><h1>Telebirr</h1><h2>${total.Telebirr} Birr</h2></div>
                    <div class="cash"><h1>CBE</h1><h2>${total.CBE} Birr</h2></div>
                    <div class="cash"><h1>Dube</h1><h2>${total.Dube} Birr</h2></div>
                `;

                const allData = [];

                if (paymentsSnap.exists()) {
                    paymentsSnap.forEach((snap) => {
                        const val = snap.val();
                        const rawTimestamp = val.timestamp;
                        const paymentDate = parseCustomDate(rawTimestamp);
                        const amount = parseFloat(val.amountInBirr);
                        const paymentMethod = val.paymentMethod;

                        if (
                            paymentDate &&
                            paymentDate.getTime() >= from.getTime() &&
                            paymentDate.getTime() <= to.getTime() &&
                            !isNaN(amount)
                        ) {
                            allData.push({
                                Name: val.name || "N/A",
                                Room: val.selectedRoom || "N/A",
                                Amount: amount + ' Birr',
                                Timestamp: val.timestamp || "N/A",
                                salesname: val.salesname,
                                sex: val.sex,
                                days: val.days,
                                selectedRoom: val.selectedRoom,
                                paymentMethod: paymentMethod,
                                phone: val.phone,
                            });
                        }
                    });
                }


                const dateDiffInMs = to - from;
                const diffInDays = dateDiffInMs / (1000 * 60 * 60 * 24);

                const allAmountsZero = total.Cash === 0 && total.Telebirr === 0 && total.CBE === 0 && total.Dube === 0;

                if (allData.length === 0 && allAmountsZero) {
                    alert("No data found in the selected range.");
                    return;
                }
                else if (diffInDays > 3) {
                    alert("more than 3 days")
                }


                // ➕ Add totals at the end of Excel
                allData.push({});
                allData.push({ Name: 'Total Cash', Room: total.Cash + ' Birr' });
                allData.push({ Name: 'Total Telebirr', Room: total.Telebirr + ' Birr' });
                allData.push({ Name: 'Total CBE', Room: total.CBE + ' Birr' });
                allData.push({ Name: 'Total Dube', Room: total.Dube + ' Birr' });

                // 📦 Export to Excel
                const worksheet = XLSX.utils.json_to_sheet(allData);
                const workbook = XLSX.utils.book_new();
                XLSX.utils.book_append_sheet(workbook, worksheet, 'Customers');
                const today = new Date();
                const months = [
                  "jan", "feb", "mar", "apr", "may", "jun",
                  "jul", "aug", "sep", "oct", "nov", "dec"
                ];
                const fileName = `report_${months[today.getMonth()]}_${today.getDate()}_${today.getFullYear()}.xlsx`;
                
                XLSX.writeFile(workbook, fileName);
                });

        } else {
            alert('Incorrect password. Please try again.');
        }
           };
});


const showBTNTimer = document.querySelector(".showBTNTimer");

showBTNTimer.addEventListener('click', () => {
  const modal = document.getElementById('removeCustomerModal');
  modal.style.display = 'block';

  document.getElementById('confirmRemoveBtn').onclick = async () => {
    const password = document.getElementById('passwordInput').value;
    const timerId = prompt("Enter the 5-digit Timer ID:");

    if (!timerId) return alert("Timer ID is required.");
    if (password !== '151584') {
      alert('Incorrect password.');
      return;
    }

    modal.style.display = 'none';
    const paymentsSnap = await get(child(ref(database), 'Payments'));

    let total = { Cash: 0, Telebirr: 0, CBE: 0, Dube: 0 };
    const allData = [];

    if (paymentsSnap.exists()) {
      paymentsSnap.forEach((snap) => {
        const val = snap.val();
        const amount = parseFloat(val.amountInBirr);
        const method = val.paymentMethod?.toLowerCase();

        if (val.timeid === timerId && !isNaN(amount)) {
          if (method.includes("cash")) total.Cash += amount;
          else if (method.includes("telebirr")) total.Telebirr += amount;
          else if (method.includes("cbe")) total.CBE += amount;
          else if (method.includes("debtors") || method.includes("dube")) total.Dube += amount;

          allData.push({
            Name: val.name || "N/A",
            Room: val.selectedRoom || "N/A",
            Amount: amount + ' Birr',
            Method: val.paymentMethod || "N/A",
            Timestamp: val.timestamp || "N/A",
            salesname: val.salesname || "N/A",
          });
        }
      });
    }

    const containerDiv = document.querySelector('.daily-amount');
    containerDiv.innerHTML = `
      <div class="cash"><h1>Cash</h1><h2>${total.Cash} Birr</h2></div>
      <div class="cash"><h1>Telebirr</h1><h2>${total.Telebirr} Birr</h2></div>
      <div class="cash"><h1>CBE</h1><h2>${total.CBE} Birr</h2></div>
      <div class="cash"><h1>Dube</h1><h2>${total.Dube} Birr</h2></div>
      <button id="downloadExcel">📥 Download Excel</button>
      <button id="downloadWord">📄 Download Word</button>
    `;

    document.getElementById("downloadExcel").addEventListener("click", () => {
      const dataForExcel = [...allData];
      dataForExcel.push({});
      dataForExcel.push({ Name: 'Total Cash', Room: total.Cash + ' Birr' });
      dataForExcel.push({ Name: 'Total Telebirr', Room: total.Telebirr + ' Birr' });
      dataForExcel.push({ Name: 'Total CBE', Room: total.CBE + ' Birr' });
      dataForExcel.push({ Name: 'Total Dube', Room: total.Dube + ' Birr' });

      const worksheet = XLSX.utils.json_to_sheet(dataForExcel);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Timer Report');

      const today = new Date();
      const fileName = `timer_${timerId}_report_${today.getFullYear()}_${today.getMonth() + 1}_${today.getDate()}.xlsx`;
      XLSX.writeFile(workbook, fileName);
    });

    document.getElementById("downloadWord").addEventListener("click", async () => {
      const {
        Document, Packer, Paragraph, Table, TableRow, TableCell,
        WidthType, TextRun, AlignmentType
      } = window.docx;

      const today = new Date();
      const doc = new Document({
        sections: [
          {
            properties: {},
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({ text: `Home Land Hotel Daily Report`, bold: true, size: 36 }),
                  new TextRun({ text: `\n${today.toDateString()}`, break: 1, size: 28 })
                ]
              }),
              new Paragraph({
                spacing: { after: 200 },
                children: [
                  new TextRun(`Salesperson: ${allData[0]?.salesname || "N/A"}`),
                  new TextRun({ text: `\nTimer ID: ${timerId}`, break: 1 }),
                  new TextRun({ text: `\nGenerated at: ${today.toLocaleTimeString()}`, break: 1 })
                ]
              }),
              new Table({
                rows: [
                  new TableRow({
                    children: ["Name", "Room", "Amount", "Method", "Timestamp"].map(header =>
                      new TableCell({
                        width: { size: 20, type: WidthType.PERCENTAGE },
                        children: [new Paragraph({ children: [new TextRun({ text: header, bold: true })] })]
                      })
                    )
                  }),
                  ...allData.map(entry => new TableRow({
                    children: ["Name", "Room", "Amount", "Method", "Timestamp"].map(field =>
                      new TableCell({
                        children: [new Paragraph(entry[field] || "N/A")]
                      })
                    )
                  }))
                ]
              }),
              new Paragraph({
                spacing: { before: 300 },
                children: [
                  new TextRun({ text: `Total Cash: ${total.Cash} Birr`, break: 1 }),
                  new TextRun({ text: `Total Telebirr: ${total.Telebirr} Birr`, break: 1 }),
                  new TextRun({ text: `Total CBE: ${total.CBE} Birr`, break: 1 }),
                  new TextRun({ text: `Total Dube: ${total.Dube} Birr`, break: 1 })
                ]
              })
            ]
          }
        ]
      });

      const blob = await Packer.toBlob(doc);
      const blobURL = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobURL;
      a.download = `timer_${timerId}_report_${today.getFullYear()}_${today.getMonth() + 1}_${today.getDate()}.docx`;
      a.click();
      URL.revokeObjectURL(blobURL);
    });
  };
});






// Function to remove the customer and their booked room
function removeCustomerORG(orgKey, roomNumber, bookingName) {
  const orgRef = ref(database, `organisation_room/${bookingName}`); // ✅ safe path

  console.log("📍 Checking path: organisation_room/" + bookingName); // will log "m_k"

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
        const orgKey = childSnapshot.key; // ✅ like "m_k"
            const customer = childSnapshot.val();
      
        for (let index = 0; index < customer.bookings.length; index++) {
          const booking = customer.bookings[index];
      
          // ...
          listItem.querySelector('.org-leaved').addEventListener('click', () => {
            showRemovePopupORG(orgKey, element.room, element.name);
          });
        
        }
      });
      
    }

    if (allData.length === 0) {
      alert("No customer data found to export.");
      return;
    }

    // Convert data to worksheet and workbook
    const worksheet = XLSX.utils.json_to_sheet(allData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Customers');

    // Trigger download
    XLSX.writeFile(workbook, 'All_Customers.xlsx');
  });