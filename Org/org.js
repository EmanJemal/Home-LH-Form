import { database, ref, set, get, update, remove, onValue, child, push } from '../Script/firebase.js';

const data = localStorage.getItem('Entering Pin');
if(data != 45284270810258310208532513043010152410200935993930){
 document.body.innerHTML = '<h1>You are not allowed</h1>'
}

// Add event listener to the submit button
const submitButton = document.querySelector('#submit-btn');

submitButton.addEventListener('click', () => {
    // Fetch form values
    const nameInput = document.querySelector('.name-lable input');
    const name = nameInput && nameInput.value.trim() !== '' ? nameInput.value.trim() : null;
        const startDate = document.querySelector('.date-lable .start-date').value;
    const endDate = document.querySelector('.date-lable .end-date').value;
    const noEmploy = document.querySelector('.employ-lable input').value;
    const noRoomReserved = document.querySelector('.noRoomReserved input').value;
    const noEmployRoomReserve = document.querySelector('.noEmployRoomReserve input').value;
    const nameOfEmploy = Array.from(document.querySelectorAll('.org-of-customer')).map(input => input.value);
    const bookedRooms = Array.from(document.querySelectorAll('.room-num')).map(input => input.value);


        // Collect form values
        const nameInputs = document.querySelectorAll('.org-of-customer'); // Collect all name inputs
        const roomInputs = document.querySelectorAll('.room-num'); // Collect all room number inputs
    
        // Map the names and booked rooms into separate arrays
        const nameOfEmployY = Array.from(nameInputs).map(input => input.value); // Store names in array
        const bookedRoomsY = Array.from(roomInputs).map(input => input.value); // Store room numbers in array
    
        // Create an array of objects to track which user booked which room
        const bookings = nameOfEmployY.map((name, index) => ({
            name: name,
            room: bookedRoomsY[index - 1] || 'Room not specified', // Ensure that every entry has a room
        }));

        

    // Identify selected room
    let selectedRoom = null;
    ['floor1', 'floor2', 'floor3', 'floor4'].forEach(floor => {
        const checkedRoom = document.querySelector(`input[name="${floor}"]:checked`);
        if (checkedRoom) selectedRoom = checkedRoom.value;
    });
    selectedRoom = selectedRoom || 'No room selected';

    const timestamp = Date.now();
    const date = new Date(timestamp);

    // Ethiopian time format
    const options = {
        timeZone: 'Africa/Addis_Ababa',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
    };
    const ethiopianTime = new Intl.DateTimeFormat('en-US', options).format(date);
    const nameOfRec = document.getElementById('passwordInput').value;

    const userData = {
        name,
        startDate,
        endDate,
        noEmploy,
        noRoomReserved,
        noEmployRoomReserve,
        nameOfEmploy,
        selectedRoom,
        timestamp: ethiopianTime,
        bookedRooms,
        bookings,
        nameOfRec
    };

    showRemovePopup(userData);
    handleSubmit(userData);
});

// Submit Data to Firebase with Confirmation
function handleSubmit(userData) {
    document.getElementById('confirmRemoveBtn').addEventListener('click', () => {

            const customerRef = ref(database, 'customers');
            const newCustomerRef = push(customerRef); // Unique entry

            const customerKey = userData.name.replace(/\s+/g, '_');
            const userRef = ref(database, `organisation_room/${customerKey}`);

            set(userRef, userData)
                .then(() => {
                    alert('Customer information submitted successfully!');
                    clearForm();
                })
                .catch((error) => {
                    console.error('Error saving data: ', error);
                    alert('Failed to submit customer information!');
                });

            if (userData.selectedRoom && userData.selectedRoom !== 'No room selected') {
                updateRoomStatus(userData.selectedRoom);
            }
        
    });
}

// Reference both 'rooms' and 'organisation_room'
const roomStatusRef = ref(database, 'rooms');
const orgRoomsRef = ref(database, 'organisation_room');

// Listen for updates on both references
onValue(roomStatusRef, (roomSnapshot) => {
    const roomsData = roomSnapshot.val();

    onValue(orgRoomsRef, (orgSnapshot) => {
        const organisations = orgSnapshot.val();

        // Update the radio buttons based on both sources
        document.querySelectorAll('input[type="radio"]').forEach(radio => {
            let isBooked = false;

            // Check 'rooms' reference
            if (roomsData && roomsData[radio.value] === 'booked') {
                isBooked = true;
            }

            // Check 'organisation_room' reference
            if (organisations) {
                for (const org in organisations) {
                    const bookedRooms = organisations[org]?.bookedRooms;
                    if (bookedRooms && bookedRooms.includes(radio.value)) {
                        isBooked = true;
                        break;
                    }
                }
            }

            // Apply styles based on booking status
            if (isBooked) {
                radio.disabled = true;
                radio.closest('li').classList.add('booked');
                radio.closest('li').style.color = 'grey';
            } else {
                radio.disabled = false;
                radio.closest('li').classList.remove('booked');
                radio.closest('li').style.color = 'black';
            }
        });
    });
});

// Update Room Status After Booking
function updateRoomStatus(roomNumber) {
    if (roomNumber && roomNumber !== 'No room selected') {
        const roomRef = ref(database, `rooms/${roomNumber}`);
        set(roomRef, 'booked')
        .then(() => {
            console.log(`Room ${roomNumber} marked as booked.`);
        })
        .catch((error) => {
            console.error('Error updating room status: ', error);
        });
    }
}

// Show Confirmation Popup
function showRemovePopup(userData) {
    const modal = document.getElementById('removeCustomerModal');
    modal.style.display = 'block';

    document.querySelector('.org-info .name').innerHTML = userData.name || 'N/A';
    document.querySelector('.org-info .start-date').innerHTML = userData.startDate || 'N/A';
    document.querySelector('.org-info .end-date').innerHTML = userData.endDate || 'N/A';
    document.querySelector('.org-info .noEmploy').innerHTML = userData.noEmploy || 'N/A';
    document.querySelector('.org-info .noRoomReserved').innerHTML = userData.noRoomReserved || 'N/A';
    document.querySelector('.org-info .selectedRoom').innerHTML = userData.selectedRoom || 'N/A';

    document.getElementById('cancelRemoveBtn').onclick = () => {
        modal.style.display = 'none';
    };
}

// Clear Form After Submission
function clearForm() {
    document.querySelectorAll('input').forEach(input => input.value = '');
    document.querySelector('#sex-options').value = 'None';
}

// Dynamic Name Labels for Employees
const orgOfEmployInput = document.getElementById('org-of-employ');
const nameLabelContainer = document.getElementById('name-label-container');

orgOfEmployInput.addEventListener('input', () => {
    const numberOfLabels = parseInt(orgOfEmployInput.value) || 0;

    nameLabelContainer.innerHTML = '';

    for (let i = 1; i <= numberOfLabels; i++) {
        const nameLabel = document.createElement('div');
        nameLabel.className = 'name-label';
        nameLabel.innerHTML = `            <div class="name-lable">
                <h3 class="lable">የእንግዳ ስም</h1>
                <input type="text" placeholder="የእንግዳ ስም" class="org-of-customer">
                <input type="text" placeholder="Room Number" class="room-num">
            </div>`;
        nameLabelContainer.appendChild(nameLabel);
    }
});

// Fetch Room Pricing and Update DOM

window.addEventListener('DOMContentLoaded', async () => {
    try {
        const roomPricingRef = ref(database, 'eachRoomsPricing');
        const snapshot = await get(roomPricingRef);
        if (!snapshot.exists()) {
            console.log('No room pricing data available');
            return;
        }
        const roomPricing = snapshot.val();

        // For each room <li> in the DOM
        document.querySelectorAll('.rooms_reserved li').forEach(li => {
            const input = li.querySelector('input.floor-input');
            if (!input) return;

            const roomNumber = input.value; // e.g. "101"
            const pricing = roomPricing[roomNumber];

            if (pricing) {
                // Update room type <h4>
                const roomTypeElement = li.querySelector('h4');
                if (roomTypeElement) {
                    // Update class for styling, e.g. "single-type"
                    roomTypeElement.className = `${pricing.roomType.toLowerCase()}-type`;
                    // Update displayed text (capitalize first letter)
                    roomTypeElement.textContent = pricing.roomType.charAt(0).toUpperCase() + pricing.roomType.slice(1);
                }

                // Update price <span>
                const priceElement = li.querySelector('span.price');
                if (priceElement) {
                    priceElement.textContent = pricing.roomAmount + ' Birr';
                }
            } else {
                // No pricing info for this room number
                const roomTypeElement = li.querySelector('h4');
                if (roomTypeElement) {
                    roomTypeElement.textContent = 'N/A';
                }
                const priceElement = li.querySelector('span.price');
                if (priceElement) {
                    priceElement.textContent = 'N/A';
                }
            }
        });
    } catch (error) {
        console.error('Error fetching room pricing:', error);
    }
});
