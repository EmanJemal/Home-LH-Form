import { database, ref, set, get, update, remove, onValue, child, push } from '../../Script/firebase.js';


// References to DOM Elements
const roomsReservedElement = document.querySelector('.total-rooms-reserved h1');
const dailyRevenueElement = document.querySelector('.total-money-made-day h2');

// Reference to the rooms and customers nodes in the database
const roomsRef = ref(database, 'rooms');
const customersRef = ref(database, 'customers');
const orgRef = ref(database, 'organisation_room');
const orgTotalBookedElement = document.getElementById('org-total-booked');
const orgTotalOtherElement = document.getElementById('org-total-other');
const orgFoodTotalElement = document.getElementById('org-food-total');
const orgUpTotalElement = document.getElementById('org-up-total');

onValue(orgRef, async (snapshot) => {
    if (!snapshot.exists()) {
        orgTotalBookedElement.textContent = '0';
        orgTotalOtherElement.textContent = '0';
        orgFoodTotalElement.textContent = '0';
        orgUpTotalElement.textContent = '0';
        return;
    }

    let totalBookedInHotel = 0;
    let totalBookedInOther = 0;
    let totalFoodAmount = 0;
    let totalUpAmount = 0;

    const orgData = snapshot.val();
    const dailyOrdersRef = ref(database, 'Daily_Orders');

    const dailyOrdersSnap = await get(dailyOrdersRef);
    const dailyOrdersData = dailyOrdersSnap.exists() ? dailyOrdersSnap.val() : {};

    Object.keys(orgData).forEach((orgName) => {
        const org = orgData[orgName];
        const bookedRooms = org.bookedRooms || [];
        const noRoomReserved = parseInt(org.noRoomReserved) || 0;

        totalBookedInHotel += bookedRooms.length;
        totalBookedInOther += noRoomReserved;

        // Normalize org name: remove _, spaces, lowercase
        const normalizedOrgName = orgName.replace(/[_\s]/g, '').toLowerCase();

        Object.keys(dailyOrdersData).forEach((dailyOrgName) => {
            const normalizedDailyName = dailyOrgName.replace(/[_\s]/g, '').toLowerCase();

            if (normalizedDailyName === normalizedOrgName) {
                const orders = dailyOrdersData[dailyOrgName];

                Object.values(orders).forEach((order) => {
                    const food = parseFloat(order.foodAmount) || 0;
                    const up = parseFloat(order.t_p) || 0;
                    totalFoodAmount += food;
                    totalUpAmount += up;
                });
            }
        });
    });

    // Display results
    orgTotalBookedElement.textContent = totalBookedInHotel;
    orgTotalOtherElement.textContent = totalBookedInOther;
    orgFoodTotalElement.textContent = totalFoodAmount.toLocaleString();
    orgUpTotalElement.textContent = totalUpAmount.toLocaleString();
});

// DOM Reference
const monthlyRevenueElement = document.querySelector('.total-money-made-month h1');

// Reference to the Payments node
const paymentsRef = ref(database, 'Payments');

/* Calculate Total Occupied Rooms */
onValue(roomsRef, (snapshot) => {
    if (snapshot.exists()) {
        const roomsData = snapshot.val();
        let bookedRoomsCount = 0;

        for (const room in roomsData) {
            if (roomsData[room] === 'booked') {
                bookedRoomsCount++;
            }
        }

        roomsReservedElement.textContent = bookedRoomsCount;
    } else {
        console.log("No room data available");
        roomsReservedElement.textContent = 0;
    }
}, (error) => {
    console.error("Error fetching room data:", error);
});

/* Calculate Total Money Made Today */
onValue(paymentsRef, (snapshot) => {
    if (!snapshot.exists()) {
        console.log("❌ No payment data");
        dailyRevenueElement.innerHTML = '0 Birr';
        return;
    }

    const data = snapshot.val();

    // 🕒 Current time in Ethiopia
    const now = new Date();
    const addisNow = new Date(now.toLocaleString("en-US", { timeZone: "Africa/Addis_Ababa" }));

    const ethioStart = new Date(addisNow);
    ethioStart.setHours(9, 0, 0, 0);

    if (addisNow < ethioStart) {
        ethioStart.setDate(ethioStart.getDate() - 1);
    }

    const ethioEnd = new Date(ethioStart);
    ethioEnd.setDate(ethioEnd.getDate() + 1);

    console.log("🔁 Ethiopian Day Range:");
    console.log("Start:", ethioStart.toString());
    console.log("End:", ethioEnd.toString());

    // 👛 Initialize totals
    let total = 0;
    let byMethod = {
        Cash: 0,
        Telebirr: 0,
        CBE: 0,
        Dube: 0
    };

    for (const id in data) {
        const val = data[id];
        const tsString = val.timestamp;

        if (tsString && typeof tsString === 'string') {
            const parsed = parseCustomTimestamp(tsString);

            if (parsed >= ethioStart && parsed < ethioEnd) {
                const amt = parseFloat(val.amountInBirr);
                if (!isNaN(amt)) {
                    total += amt;

                    const method = (val.paymentMethod || '').toLowerCase();
                    if (method.includes("cash")) byMethod.Cash += amt;
                    else if (method.includes("telebirr")) byMethod.Telebirr += amt;
                    else if (method.includes("cbe")) byMethod.CBE += amt;
                    else if (method.includes("dube") || method.includes("debtors")) byMethod.Dube += amt;
                }
            }
        }
    }

    console.log("💰 Final Total:", total);

    dailyRevenueElement.innerHTML = `
        <div><strong>Cash:</strong> ${byMethod.Cash.toLocaleString()} Birr</div>
        <div><strong>Telebirr:</strong> ${byMethod.Telebirr.toLocaleString()} Birr</div>
        <div><strong>CBE:</strong> ${byMethod.CBE.toLocaleString()} Birr</div>
        <div><strong>Dube:</strong> ${byMethod.Dube.toLocaleString()} Birr</div>
        <div><strong>Total:</strong> ${total.toLocaleString()} Birr</div>
    `;
});








/* Calculate Monthly Revenue by Payment Method */
onValue(paymentsRef, (snapshot) => {
    if (snapshot.exists()) {
        const paymentsData = snapshot.val();

        // Initialize totals by method
        let total = {
            Cash: 0,
            Telebirr: 0,
            CBE: 0,
            Dube: 0
        };

        // Get current year and month
        const currentDate = new Date();
        const currentYear = currentDate.getFullYear();
        const currentMonth = currentDate.getMonth() + 1;

        for (const paymentId in paymentsData) {
            const payment = paymentsData[paymentId];
            const rawTimestamp = payment.timestamp;
            const amount = parseFloat(payment.amountInBirr);
            const method = (payment.paymentMethod || '').toLowerCase();

            const paymentDate = parseCustomTimestamp(rawTimestamp);
            console.log('Timestamp:', rawTimestamp);
            console.log('Parsed:', paymentDate);
            console.log('Month Match:', 
                paymentDate && 
                paymentDate.getFullYear() === currentYear &&
                paymentDate.getMonth() + 1 === currentMonth
            );
            
            if (
                paymentDate &&
                paymentDate.getFullYear() === currentYear &&
                paymentDate.getMonth() + 1 === currentMonth &&
                !isNaN(amount)
            ) {
                if (method.includes('cash')) total.Cash += amount;
                else if (method.includes('telebirr')) total.Telebirr += amount;
                else if (method.includes('cbe')) total.CBE += amount;
                else if (method.includes('debtors') || method.includes('dube')) total.Dube += amount;
            }
        }

        // Show results in the monthly box
        monthlyRevenueElement.innerHTML = `
            <div><strong>Cash:</strong> ${total.Cash.toLocaleString()} Birr</div>
            <div><strong>Telebirr:</strong> ${total.Telebirr.toLocaleString()} Birr</div>
            <div><strong>CBE:</strong> ${total.CBE.toLocaleString()} Birr</div>
            <div><strong>Dube:</strong> ${total.Dube.toLocaleString()} Birr</div>
        `;
    } else {
        console.warn("No payment data found for this month.");
        monthlyRevenueElement.innerHTML = '0 Birr';
    }
}, (error) => {
    console.error("Error fetching payment data: ", error);
    monthlyRevenueElement.innerHTML = 'Error';
});


function parseCustomTimestampcbe(timestamp) {
    if (!timestamp || typeof timestamp !== "string") {
        console.warn("⛔ Invalid or missing timestamp:", timestamp);
        return null;
    }

    const regex = /([a-zA-Z]+) (\d{1,2}), (\d{4}) at (\d{1,2}):(\d{2}):(\d{2}) (AM|PM)/;
    const match = timestamp.match(regex);

    if (match) {
        const monthStr = match[1];
        const day = parseInt(match[2], 10);
        const year = parseInt(match[3], 10);
        let hour = parseInt(match[4], 10);
        const minute = parseInt(match[5], 10);
        const second = parseInt(match[6], 10);
        const period = match[7];

        if (period === 'PM' && hour < 12) hour += 12;
        if (period === 'AM' && hour === 12) hour = 0;

        const month = new Date(Date.parse(`${monthStr} 1, 2000`)).getMonth(); 
        return new Date(year, month, day, hour, minute, second);
    }

    console.error('❌ Timestamp did not match expected format:', timestamp);
    return null;
    }


onValue(paymentsRef, (snapshot) => {
    if (!monthlyRevenueElement) {
        console.error("❌ Could not find .monthly-values element.");
        return;
    }

    if (snapshot.exists()) {
        const paymentsData = snapshot.val();

        const currentDate = new Date();
        const currentYear = currentDate.getFullYear();
        const currentMonth = currentDate.getMonth() + 1;

        let total = 0;
        let byMethod = {
            Cash: 0,
            Telebirr: 0,
            CBE: 0,
            Dube: 0
        };

        for (const id in paymentsData) {
            const payment = paymentsData[id];
            const rawTimestamp = payment.timestamp;
            const method = (payment.paymentMethod || '').toLowerCase();
            const amount = parseFloat(payment.amountInBirr);

            const paymentDate = parseCustomTimestampcbe(rawTimestamp);

            if (
                paymentDate &&
                paymentDate.getFullYear() === currentYear &&
                paymentDate.getMonth() + 1 === currentMonth &&
                !isNaN(amount)
            ) {
                total += amount;

                if (method.includes("cash")) byMethod.Cash += amount;
                else if (method.includes("telebirr")) byMethod.Telebirr += amount;
                else if (method.includes("cbe")) byMethod.CBE += amount;
                else if (method.includes("dube") || method.includes("debtors")) byMethod.Dube += amount;
            }
        }

        console.log("✅ Monthly Revenue Totals:", byMethod);

        monthlyRevenueElement.innerHTML = `
            <div><strong>Cash:</strong> ${byMethod.Cash.toLocaleString()} Birr</div>
            <div><strong>Telebirr:</strong> ${byMethod.Telebirr.toLocaleString()} Birr</div>
            <div><strong>CBE:</strong> ${byMethod.CBE.toLocaleString()} Birr</div>
            <div><strong>Dube:</strong> ${byMethod.Dube.toLocaleString()} Birr</div>
            <div><strong>Total:</strong> ${total.toLocaleString()} Birr</div>
        `;
    } else {
        console.warn("⚠️ No payment data for the month.");
        monthlyRevenueElement.innerText = '0 Birr';
    }
}, (err) => {
    console.error("❌ Error fetching monthly payments:", err);
    monthlyRevenueElement.innerText = 'Error';
});


function parseCustomTimestamp(timestamp) {
    if (!timestamp) return null;

    // If it's a number (e.g., UNIX ms)
    if (typeof timestamp === 'number') {
        return new Date(timestamp);
    }

    // If it's a Firebase string like "July 29, 2025 at 2:32:00 PM"
    const regex = /([a-zA-Z]+) (\d{1,2}), (\d{4}) at (\d{1,2}):(\d{2}):(\d{2}) (AM|PM)/;
    const match = String(timestamp).match(regex);

    if (match) {
        const [_, monthStr, day, year, hourStr, minuteStr, secondStr, period] = match;
        let hour = parseInt(hourStr);
        if (period === 'PM' && hour < 12) hour += 12;
        if (period === 'AM' && hour === 12) hour = 0;

        const month = new Date(Date.parse(`${monthStr} 1, 2000`)).getMonth();
        return new Date(parseInt(year), month, parseInt(day), hour, parseInt(minuteStr), parseInt(secondStr));
    }

    // Try fallback
    const date = new Date(timestamp);
    return isNaN(date.getTime()) ? null : date;
}










// Function to update the UI based on room booking status
function updateRoomStatus(roomNumber, status) {
    // Create a new list item for each room
    const roomElement = document.createElement('li');
    roomElement.textContent = roomNumber;
    roomElement.dataset.room = roomNumber; // Set room number as a data attribute

    // Add appropriate class based on room status
    if (status === 'booked') {
        roomElement.classList.add('booked');
    } else {
        roomElement.classList.add('available');
    }

    // Append the room to the correct floor based on the room number
    if (roomNumber.startsWith('10')) {
        document.querySelector('#floor-one').appendChild(roomElement);
    } else if (roomNumber.startsWith('20')) {
        document.querySelector('#floor-two').appendChild(roomElement);
    } else if (roomNumber.startsWith('30')) {
        document.querySelector('#floor-three').appendChild(roomElement);
    } else if (roomNumber.startsWith('40')) {
        document.querySelector('#floor-four').appendChild(roomElement);
    }
}

// Fetch room statuses from Firebase
onValue(roomsRef, (snapshot) => {
    const roomsData = snapshot.val();

    // Clear the previous room data to avoid duplication
    document.querySelector('#floor-one').innerHTML = '';
    document.querySelector('#floor-two').innerHTML = '';
    document.querySelector('#floor-three').innerHTML = '';
    document.querySelector('#floor-four').innerHTML = '';

    // Iterate over rooms data and display rooms dynamically
    Object.keys(roomsData).forEach((roomNumber) => {
        const status = roomsData[roomNumber];
        updateRoomStatus(roomNumber, status);
    });
});





// Function to update the UI based on room booking status
function updateRoomStatusORG(roomNumber, status) {
    const roomElement = document.createElement('li');
    roomElement.textContent = roomNumber;
    roomElement.dataset.room = roomNumber;

    if (status === 'booked') {
        roomElement.classList.add('booked');
    } else {
        roomElement.classList.add('available');
    }

    if (roomNumber.startsWith('10')) {
        document.querySelector('#org-floor-one').appendChild(roomElement);
    } else if (roomNumber.startsWith('20')) {
        document.querySelector('#org-floor-two').appendChild(roomElement);
    } else if (roomNumber.startsWith('30')) {
        document.querySelector('#org-floor-three').appendChild(roomElement);
    } else if (roomNumber.startsWith('40')) {
        document.querySelector('#org-floor-four').appendChild(roomElement);
    }
}


// Fetch room statuses from Firebase
onValue(orgRef, (snapshot) => {
    const container = document.getElementById('org-list');
    container.innerHTML = ''; // Clear existing orgs

    if (!snapshot.exists()) {
        container.innerHTML = '<p>No organisation data found.</p>';
        return;
    }

    const orgData = snapshot.val();

    Object.entries(orgData).forEach(([orgName, orgDetails]) => {
        const {
            bookedRooms = [],
            startDate = 'N/A',
            endDate = 'N/A',
            noRoomReserved = 0,
            amount = ''
        } = orgDetails;
    
        const bookedRoomCount = bookedRooms.length || 0;
        const roomList = bookedRooms.map(room => `<span class="room-bullet">• ${room}</span>`).join(' ');
    
        const uniqueId = orgName.replace(/\s+/g, '_') + '_amount';
    
        const html = `
            <div class="org-card">
                <h3>🏢 <strong>${orgName}</strong></h3>
                <p>🗓 <strong>Start Date:</strong> ${startDate}</p>
                <p>🗓 <strong>End Date:</strong> ${endDate}</p>
                <p>🛏 <strong>Rooms in Hotel:</strong> ${bookedRoomCount}</p>
                <p>🏨 <strong>Rooms Booked in Other Hotels:</strong> ${noRoomReserved}</p>
                <p>📋 <strong>Reserved Room Numbers:</strong><br> ${roomList}</p>
    
                <div class="amount-section" style="margin-top: 15px;">
                    <label for="${uniqueId}">💵 Amount:</label>
                    <input type="number" id="${uniqueId}" value="${amount}" placeholder="Enter amount">
                    <button data-org="${orgName}" class="save-amount-btn">Save</button>
                </div>
    
                <hr>
            </div>
        `;
    
        container.innerHTML += html;
    });

    // Event delegation to handle all Save buttons
document.addEventListener('click', async (e) => {
    if (e.target.classList.contains('save-amount-btn')) {
        const orgName = e.target.dataset.org;
        const inputId = orgName.replace(/\s+/g, '_') + '_amount';
        const amountValue = document.getElementById(inputId).value;

        try {
            await update(ref(database, `organisation_room/${orgName}`), {
                amount: parseFloat(amountValue) || 0
            });

            alert(`✅ Amount updated for ${orgName}`);
        } catch (error) {
            console.error(`❌ Failed to update amount for ${orgName}:`, error);
            alert(`❌ Failed to update amount for ${orgName}`);
        }
    }
});

    
});




// Function to get the last 6 days with the format "Month short form day"
function getLastSixDays() {
    const daysContainer = document.querySelector('.days'); // The container where the days will be displayed
    const today = new Date();
    
    // Loop through the last 6 days
    for (let i = 0; i < 6; i++) {
        const date = new Date(today); // Create a new date object to avoid mutation
        date.setDate(today.getDate() - i); // Subtract days from today
        
        // Get the month (short form like Jan, Feb, Mar, etc.)
        const month = date.toLocaleString('en-US', { month: 'short' });
        
        // Get the day of the month (e.g., 26)
        const day = date.getDate();
        
        // Create a div for each day
        const dayDiv = document.createElement('div');
        dayDiv.classList.add('day');
        
        // Add the month and day as h2 elements
        dayDiv.innerHTML = `<h2 class="month-last-six-day">${month}</h2> <h2>${day}</h2>`;
        
        // Append the new day div to the container
        daysContainer.appendChild(dayDiv);
    }
}

// Call the function to display the last 6 days
getLastSixDays();


// Select all the elements with the class 'day'
const days = document.querySelectorAll('.day');

// Function to format the date as "Month short form day"
function formatDate(month, day) {
    const date = new Date();
    date.setMonth(month - 1); // Months are 0-indexed
    date.setDate(day);
    return date.toLocaleString('en-US', { month: 'short', day: '2-digit' }); // Example: "Dec 28"
}


days.forEach(day => {
    day.addEventListener('click', async (event) => {
        const roomsContainer = document.querySelector('.rooms');
        roomsContainer.innerHTML = ''; // Clear previous

        // Get clicked Gregorian date
        const dayNumber = event.target.closest('.day').querySelector('h2:nth-of-type(2)').textContent;
        const monthStr = event.target.closest('.day').querySelector('h2:nth-of-type(1)').textContent;
        const selectedGregorian = new Date(`${monthStr} ${dayNumber}, ${new Date().getFullYear()} 12:00:00`);
        if (isNaN(selectedGregorian)) return console.warn("Invalid Gregorian date");

        const gcString = selectedGregorian.toISOString().split('T')[0];

        // Convert to Ethiopian date
        const ecRes = await fetch(`https://api.ethioall.com/convert/api?gc=${gcString}`);
        const ecData = await ecRes.json();
        const clickedEC = `${ecData[0].year}-${String(ecData[0].month).padStart(2, '0')}-${String(ecData[0].day).padStart(2, '0')}`;
        console.log(`📅 EC Clicked: ${clickedEC}`);

        // Fetch Firebase data
        const [paymentsSnap, timersSnap] = await Promise.all([
            get(ref(database, 'Payments')),
            get(ref(database, 'timer_id_ver'))
        ]);

        if (!paymentsSnap.exists()) return console.log("No payments data");
        if (!timersSnap.exists()) return console.log("No timer data");

        const payments = paymentsSnap.val();
        const timerData = timersSnap.val();

        // Match payments by clicked Gregorian date
        const matchingPayments = [];
        for (const id in payments) {
            const payment = payments[id];
            const parsed = parseCustomTimestamp(payment.timestamp);
            if (parsed && parsed.toDateString() === selectedGregorian.toDateString()) {
                matchingPayments.push(payment);
            }
        }

        // Build timer summary
        const timerSummary = {};
        for (const payment of matchingPayments) {
            const { timeid, amountInBirr, paymentMethod } = payment;
            if (!timeid) continue;

            const method = (paymentMethod || '').toLowerCase();
            const amount = parseFloat(amountInBirr);
            if (isNaN(amount)) continue;

            if (!timerSummary[timeid]) {
                timerSummary[timeid] = {
                    CBE: 0,
                    Cash: 0,
                    Telebirr: 0,
                    Dube: 0,
                    total: 0,
                    salesname: timerData[timeid]?.salesname || 'Unknown',
                    ecMatch: false
                };
            }

            if (method.includes('cash')) timerSummary[timeid].Cash += amount;
            else if (method.includes('telebirr')) timerSummary[timeid].Telebirr += amount;
            else if (method.includes('cbe')) timerSummary[timeid].CBE += amount;
            else if (method.includes('dube') || method.includes('debtors')) timerSummary[timeid].Dube += amount;

            timerSummary[timeid].total += amount;
        }

        // Convert all timer_id timestamps to EC and check match
        const ecTimerChecks = await Promise.all(Object.entries(timerData).map(async ([tid, data]) => {
            if (!data.time) return null;
            const timerDate = new Date(data.time);
            const gcStr = timerDate.toISOString().split('T')[0];

            try {
                const res = await fetch(`https://api.ethioall.com/convert/api?gc=${gcStr}`);
                const json = await res.json();
                const ecDate = `${json[0].year}-${String(json[0].month).padStart(2, '0')}-${String(json[0].day).padStart(2, '0')}`;
                return { timeid: tid, ecDate };
            } catch (err) {
                console.warn("⛔ EC conversion failed for timer", tid, err);
                return null;
            }
        }));

        ecTimerChecks
            .filter(Boolean)
            .forEach(({ timeid, ecDate }) => {
                if (ecDate === clickedEC && timerSummary[timeid]) {
                    timerSummary[timeid].ecMatch = true;
                }
            });

        // ⬆️ Add timer summaries FIRST
        const summaryBox = document.createElement('div');
        summaryBox.className = 'timer-summary';
        summaryBox.innerHTML = `<h2 style="margin-bottom:10px">🧾 Timer Summary</h2>`;

        for (const [timeid, info] of Object.entries(timerSummary)) {
            if (!info.ecMatch) continue;

            summaryBox.innerHTML += `
                <div class="timer-box">
                    <h3>🆔 ${timeid}</h3>
                    <p><strong>👤 Salesname:</strong> ${info.salesname}</p>
                    <p><strong>🏦 CBE:</strong> ${info.CBE.toLocaleString()} Birr</p>
                    <p><strong>📱 Telebirr:</strong> ${info.Telebirr.toLocaleString()} Birr</p>
                    <p><strong>💵 Cash:</strong> ${info.Cash.toLocaleString()} Birr</p>
                    <p><strong>📒 Dube:</strong> ${info.Dube.toLocaleString()} Birr</p>
                    <p><strong style="color:green">Total:</strong> <strong style="color:green">${info.total.toLocaleString()} Birr</strong></p>
                </div>
            `;
        }

        roomsContainer.appendChild(summaryBox); // Add summary at the top
        // 💰 Compute grand total for the day
        let dailyTotal = 0;
        for (const [timeid, info] of Object.entries(timerSummary)) {
            if (info.ecMatch) {
                dailyTotal += info.total;
            }
        }

        // 🧾 Display daily total summary box
        const dailySummary = document.createElement('div');
        dailySummary.className = 'daily-total-summary';
        dailySummary.innerHTML = `
            <div class="daily-summary-box" style="background:#f5f5f5;padding:10px;border-radius:8px;margin-bottom:15px;border:1px solid #ccc">
                <h2 style="margin:0;font-size:1.2em;">📊 Total Income for ${clickedEC}</h2>
                <p style="font-weight:bold;font-size:1.5em;color:green;margin:5px 0;">${dailyTotal.toLocaleString()} Birr</p>
            </div>
        `;
        roomsContainer.appendChild(dailySummary); // Add daily total first
// 🗂️ Fetch and summarize from /excel_register/{ec_date}
const excelRef = ref(database, `excel_register/${clickedEC}`);
const excelSnap = await get(excelRef);

if (excelSnap.exists()) {
    const excelData = excelSnap.val();
    const categoryTotals = {};
    let excelGrandTotal = 0;
    
    for (const itemId in excelData) {
        const entry = excelData[itemId];
        const cat = (entry.category || 'Other').toUpperCase();
        const amount = parseFloat(entry.grandPrice);
        if (isNaN(amount)) continue;

        if (!categoryTotals[cat]) categoryTotals[cat] = 0;
        categoryTotals[cat] += amount;
        excelGrandTotal += amount;
        
    }

    // 🧾 Display Excel Register Summary
    const excelSummaryBox = document.createElement('div');
    excelSummaryBox.className = 'excel-summary';
    excelSummaryBox.innerHTML = `
    <div class="excel-summary-box" style="background:#fff7e6;padding:10px;border-radius:8px;margin-bottom:15px;border:1px solid #ddd">
        <h2 style="margin:0;font-size:1.2em;">📦 Services Summary (From /excel_register)</h2>
        ${Object.entries(categoryTotals).map(([cat, val]) => `
            <p><strong>${cat}:</strong> ${val.toLocaleString()} Birr</p>
        `).join('')}
        <p style="margin-top:10px;font-weight:bold;color:green;">💰 Grand Total: ${excelGrandTotal.toLocaleString()} Birr</p>
    </div>
`;

    roomsContainer.appendChild(excelSummaryBox);
}

        // Then display matching room entries
        matchingPayments.forEach(payment => {
            const HTML = `
                <div class="room">
                    <h1 class="room-no">Room ${payment.selectedRoom}</h1>
                    <h3>${payment.name}</h3>
                    <h3 class="date">${payment.timestamp}</h3>
                    <p><strong> Sex:</strong><strong class="color-blue"> ${payment.sex}</strong></p>
                    <p><strong> Original Length of stay:</strong> <strong class="color-blue">${payment.days} Days</strong></p>
                    <p><strong> Payment Method:</strong><strong class="color-blue"> ${payment.paymentMethod}</strong></p>
                    <p><strong> Amount:</strong> <strong class="color-blue">${payment.amountInBirr} Birr</strong></p>
                    <p><strong> Registration by:</strong> <strong class="color-blue">${payment.salesname}</strong></p>
                    <p><strong> Phone:</strong><strong class="color-blue"> ${payment.phone}</strong></p>
                </div>`;
            roomsContainer.innerHTML += HTML;
        });

        // Highlight selected day
        days.forEach(d => d.classList.remove('selected'));
        event.target.closest('.day').classList.add('selected');
    });
});





const selectedDate = document.querySelector('.free-hand-date')

selectedDate.addEventListener('change', async (event) => {
    document.querySelector('.rooms').innerHTML = '';

    const selectedDateValue = selectedDate.value; // e.g., "2025-07-29"
    const selectedDateObj = new Date(selectedDateValue);

    if (isNaN(selectedDateObj)) {
        console.warn("❌ Invalid selected date");
        return;
    }

    const selectedDateString = selectedDateObj.toDateString(); // e.g., "Tue Jul 29 2025"

    const paymentsRef = ref(database, 'Payments');
    const snapshot = await get(paymentsRef);

    if (!snapshot.exists()) {
        console.log('No payments data available');
        return;
    }

    const payments = snapshot.val();
    const matchingPayments = [];

    for (const paymentId in payments) {
        const payment = payments[paymentId];

        const paymentDateObj = parseCustomTimestamp(payment.timestamp);
        if (!paymentDateObj) continue;

        if (paymentDateObj.toDateString() === selectedDateString) {
            matchingPayments.push(payment);
        }
    }

    if (matchingPayments.length > 0) {
        matchingPayments.forEach((payment) => {
            const HTML = `
                <div class="room">
                    <h1 class="room-no">Room ${payment.selectedRoom}</h1>
                    <h3>${payment.name}</h3>
                    <h3 class="date">${payment.timestamp}</h3>
                    <p><strong> Sex:</strong><strong class="color-blue"> ${payment.sex}</strong></p>
                    <p><strong> Original Length of stay:</strong> <strong class="color-blue">${payment.days} Days</strong></p>
                    <p><strong> Payment Method:</strong><strong class="color-blue"> ${payment.paymentMethod}</strong></p>
                    <p><strong> Amount:</strong> <strong class="color-blue">${payment.amountInBirr} Birr</strong></p>
                    <p><strong> Registration by:</strong> <strong class="color-blue">${payment.salesname}</strong></p>
                    <p><strong> Phone:</strong><strong class="color-blue"> ${payment.phone}</strong></p>
                </div>`;
            document.querySelector('.rooms').innerHTML += HTML;
        });
    } else {
        console.log('No payments found for selected date');
    }
});
