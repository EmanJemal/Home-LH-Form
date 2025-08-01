import { database, ref, set, get, update, remove, onValue, child, push } from '../Script/firebase.js';
import { auth, onAuthStateChanged } from '../Script/firebase.js';

onAuthStateChanged(auth, (user) => {
  if (!user) {
    // 🚨 Not authenticated, redirect to login page
    window.location.href = '../log-in/loginpage.html';
  } else {
    console.log('✅ Authenticated as:', user.uid);
    // continue as normal...
  }
});

 //localStorage.setItem('Entering Pin', 45284270810258310208532513043010152410200935993930) 

const data = localStorage.getItem('Entering Pin');
if(data != 45284270810258310208532513043010152410200935993930){
 document.body.innerHTML = '<h1>You are not allowed</h1>'
}

  


// Fetch the room types from Firebase and update the webpage
document.addEventListener("DOMContentLoaded", function () {
    // Reference to the 'eachRoomPricing' node in Firebase
    const roomsRef = ref(database, 'eachRoomsPricing');

    const input = document.querySelector('.name-of-days');

    // Fetch the room pricing data from 
    get(roomsRef)
        .then(snapshot => {
            if (snapshot.exists()) {
                const roomsData = snapshot.val(); // Get the data from Firebase

                // Iterate over the roomsData to update the room types in HTML
                for (const roomNumber in roomsData) {
                    if (roomsData.hasOwnProperty(roomNumber)) {
                        const room = roomsData[roomNumber];

                        // Determine floor based on room number
                        const floorSelector = roomNumber.startsWith('1') ? '#floor-1-rooms' : roomNumber.startsWith('2') ? '#floor-2-rooms' : roomNumber.startsWith('3') ? '#floor-3-rooms' : '#floor-4-rooms';

                        // Find the corresponding room in the HTML by room number
                        const roomItem = document.querySelector(`${floorSelector} li input[value="${roomNumber}"]`);

                        if (roomItem) {
                            // Update room type and pricing
                            const roomTypeElement = roomItem.closest('li').querySelector('h4');
                            const roomPriceElement = roomItem.closest('li').querySelector('.price');

                            console.log(roomPriceElement)
                            if (roomTypeElement) {
                                roomTypeElement.innerText = room.roomType;

                                    roomPriceElement.textContent = room.roomAmount;
                              

                                // Add CSS classes based on room type
                                if (room.roomType === 'Double') {
                                    roomTypeElement.className = 'double-type';
                                } else if (room.roomType === 'Deluxe') {
                                    roomTypeElement.className = 'deluxe-type';
                                } else if (room.roomType === 'Standard') {
                                    roomTypeElement.className = 'standard-type';
                                } else if (room.roomType === 'Single') {
                                    roomTypeElement.className = 'single-type';
                                }
                            }
                        }
                    }
                }
            } else {
                console.log("No data available in Firebase.");
            }
        })
        .catch(error => {
            console.error("Error fetching room data from Firebase:", error);
        });
});

window.addEventListener('DOMContentLoaded', () => {
    (async () => {
        async function getTimerId() {
            const timerRef = ref(database, 'timer');
            const snapshot = await get(timerRef);
          
            if (!snapshot.exists()) return null;
          
            const timerData = snapshot.val();
          
            // Since timerData is a single object, get timer_id directly:
            return timerData.name || null;
          }
          
  
      const timerId = await getTimerId();
      console.log("✅ Fetched timerId:", timerId);

      const salesname = document.querySelector('.sales-lable input');
      if (salesname && timerId) {
        salesname.value = timerId;
      }
  
      const daysInput = document.querySelector('.days-lable input');
      if (daysInput) {
        daysInput.value = 1;
      }
  
      const submitButton = document.querySelector('#submit-btn');
      submitButton.addEventListener('click', async () => {
        const customerRef = ref(database, 'customers');
        const newCustomerRef = push(customerRef);
        // Your save logic goes here
      });
    })();
  });
  
  
// Add event listener to the submit button
const submitButton = document.querySelector('#submit-btn');
document.querySelector('.days-lable').value = 1;

submitButton.addEventListener('click', async() => {
    // Fetch form values
    const customerRef = ref(database, 'customers');
    const newCustomerRef = push(customerRef); // push generates unique key
    const customerId = newCustomerRef.key;      
    const name = document.querySelector('.name-lable input').value;
    const phone = document.querySelector('.phone-lable input').value;
    const salesname = document.querySelector('.sales-lable input').value;
    const age = document.querySelector('.age-lable input').value;
    const nationality = document.querySelector('.nationality-lable input').value;
    const sex = document.querySelector('#sex-options').value;
    const days = document.querySelector('.days-lable input').value;
//    const finalDate = document.querySelector('.final-days-lable input').value;
    const selectedPayment = document.querySelector('input[name="payment"]:checked')?.value;
    const amountInBirr = document.querySelector('.calculation .answer').innerHTML;
    const nameOfRec = document.getElementById('passwordInput').innerHTML;
//    const screneenshot = document.querySelector('.screneenshot-lable input').value;

    // ✅ This is the true customer ID 
    
    // Identify selected room
    let selectedRoom = null;
    ['floor1', 'floor2', 'floor3', 'floor4'].forEach(floor => {
        const checkedRoom = document.querySelector(`input[name="${floor}"]:checked`);
        if (checkedRoom) selectedRoom = checkedRoom.value;
    });
    
    const timestamp = Date.now();

    async function getTimerId() {
        const timerRef = ref(database, 'timer');
        const snapshot = await get(timerRef);
      
        if (!snapshot.exists()) return null;
      
        const timerData = snapshot.val();
        return timerData?.timer_id || null;
      }
      
      const timerId = await getTimerId();
      if (!timerId) {
        alert("⛔ No active timer found. Start your timer from the bot first.");
        return;
      }
      console.log("✅ Timer ID:", timerId);
      
      
    if (!name || !salesname || !days || !selectedRoom || !selectedPayment) {
        alert("Please fill in all required fields:\n- Name\n- Sales Name\n- Days\n- Final Date\n- Room Selection\n- Payment Method");
        return; // stop further execution
    }

  

    const date = new Date(timestamp);

        // Convert to Ethiopian time (UTC+3)
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

        // Format the date to Ethiopian time
    const ethiopianTime = new Intl.DateTimeFormat('en-US', options).format(date);


        
    const userData = {
        name: name,
        salesname: salesname,
        age: age,
        timeid: String(timerId),
        nationality: nationality,
        sex: sex,
        days: days,
        selectedRoom: selectedRoom,
        timestamp: ethiopianTime,
        paymentMethod: selectedPayment,
//       finalDate: finalDate,
        amountInBirr: amountInBirr,
        customerId: customerId,
        nameOfRec: nameOfRec,
        phone: phone,
        //screenshot_id: screneenshot,
    }

    const paymentData = {
        name: name,
        salesname: salesname,
        timeid: String(timerId),
        age: age,
        nationality: nationality,
        customerId: customerId,
        sex: sex,
        days: days,
        selectedRoom: selectedRoom,
        timestamp: ethiopianTime,
        paymentMethod: selectedPayment,
        amountInBirr: amountInBirr,
        nameOfRec: nameOfRec,
        phone: phone,
       // screenshot_id: screneenshot,
    }

    showRemovePopup(userData);


    document.getElementById('confirmRemoveBtn').addEventListener('click', () => {
        const confirmBtn = document.getElementById('confirmRemoveBtn');
        confirmBtn.disabled = true;
        const originalText = confirmBtn.textContent;
        confirmBtn.textContent = "Confirming...";
    
        const userRef = ref(database, `customers/${customerId}`);
        const timestamp = Date.now();
        const date = new Date(timestamp);
    
        const options = {
            timeZone: 'Africa/Addis_Ababa',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false
        };
    
        const ethiopianTime = new Intl.DateTimeFormat('en-US', options).format(date);
    
        let selectedRoom = null;
        ['floor1', 'floor2', 'floor3', 'floor4'].forEach(floor => {
            const checkedRoom = document.querySelector(`input[name="${floor}"]:checked`);
            if (checkedRoom) selectedRoom = checkedRoom.value;
        });
    
        if (selectedRoom && selectedRoom !== 'No room selected') {
            const roomRef = ref(database, `rooms/${selectedRoom}`);
            get(roomRef).then(snapshot => {
                if (snapshot.exists() && snapshot.val() === 'booked') {
                    alert("⛔ This room was just booked by someone else. Please choose another.");
                    confirmBtn.disabled = false;
                    confirmBtn.textContent = originalText;
                    return;
                }
    
                updateRoomStatus(selectedRoom);
    
                set(userRef, userData)
                    .then(() => {
                        alert('Customer information submitted successfully!');
                        location.reload();
                        document.querySelectorAll('input').forEach(input => input.value = '');
                        document.querySelector('#sex-options').value = 'male';
                    })
                    .catch((error) => {
                        console.error('Error saving data: ', error);
                        alert('Failed to submit customer information!');
                        confirmBtn.disabled = false;
                        confirmBtn.textContent = originalText;
                    });
    
                const amtRef = ref(database, `Payments/${customerId}`);
                set(amtRef, paymentData)
                    .then(() => {
                        console.log('Payment data successfully saved!');
                    })
                    .catch((error) => {
                        console.error('Error saving payment data:', error);
                        alert('Failed to submit customer payment information!');
                        confirmBtn.disabled = false;
                        confirmBtn.textContent = originalText;
                    });
    
            }).catch(error => {
                console.error('Error checking room status:', error);
                alert('Failed to verify room status. Please try again.');
                confirmBtn.disabled = false;
                confirmBtn.textContent = originalText;
            });
        }
    
        // 7-digit random key generation and duplicate payment set (kept as-is)
        function generateRandomKey() {
            return Math.floor(1000000000 + Math.random() * 90000000000);
        }
    
        const randomKey = generateRandomKey();
        const paymentRef = ref(database, 'Payments');
        const amtRef = ref(database, `Payments/${customerId}`);
    
        set(amtRef, paymentData)
            .then(() => {
                console.log('Payment data successfully saved!');
            })
            .catch((error) => {
                console.error('Error saving data: ', error);
                alert('Failed to submit customer payment information!');
                confirmBtn.disabled = false;
                confirmBtn.textContent = originalText;
            });
    });
    

});

// Real-time Listener for Room Availability
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


// Fetch elements from the DOM
const daysInput = document.querySelector('.days-lable input');
const amountInBirr = document.querySelector('.amount-in-birr');
const lengthOfStay = document.querySelector('.length-of-stay');
const answerBrr = document.querySelector('.answer-brr');
const extra_listner = document.querySelector('.extra-lable input');

// Update the amount based on the number of days selected
daysInput.addEventListener('input', () => {
    const days = parseInt(daysInput.value) || 1;
    const amount = parseFloat(document.querySelector('.amount-in-birr').textContent) || 0;
    const totalAmount = amount * days;
    const extra = parseFloat(document.querySelector('.extra-lable input').value) || 0;

    lengthOfStay.textContent = `* ${days}`;
    const finalAmt = totalAmount + extra;

    answerBrr.querySelector('.answer').textContent = `${finalAmt}`;
});


extra_listner.addEventListener('input', () => {
    const days = parseInt(daysInput.value) || 1;
    const amount = parseFloat(document.querySelector('.amount-in-birr').textContent) || 0;
    const totalAmount = amount * days;
    const extra = parseFloat(document.querySelector('.extra-lable input').value) || 0;

    lengthOfStay.textContent = `* ${days}`;
    const finalAmt = totalAmount + extra;

    answerBrr.querySelector('.answer').textContent = `${finalAmt}`;
});





// rooms price

window.addEventListener('DOMContentLoaded', (event) => {
    // Function to get room pricing from Firebase
    const getRoomPricing = async () => {
        try {
            // Get the roomPricing data from the Firebase database
            const roomPricingRef = ref(database, 'roomPricing');
            const snapshot = await get(roomPricingRef);

            if (snapshot.exists()) {
                const roomPricing = snapshot.val();
                updateRoomPrices(roomPricing);
            } else {
                console.log('No room pricing data available');
            }
        } catch (error) {
            console.error('Error fetching room pricing:', error);
        }
    };

    // Function to update room prices in the DOM
    const updateRoomPrices = (roomPricing) => {
        // Select all h3 elements that represent room types
        const roomTypes = document.querySelectorAll('h4');

        roomTypes.forEach((roomTypeElement) => {
            const roomTypeClass = roomTypeElement.className.toLowerCase().split('-')[0]; // Get the room type from the class name
            const priceElement = roomTypeElement.nextElementSibling?.nextElementSibling; // Safe navigation using optional chaining

            
            // Ensure priceElement exists and update the price
            if (priceElement && roomPricing[roomTypeClass] && priceElement.innerHTML.trim() === '') {
                priceElement.textContent = roomPricing[roomTypeClass];
            } else if (priceElement) {
            }
        });
    };

    // Fetch room pricing when the page loads
    getRoomPricing();
});






function recalculateFinalAmount() {
    const days = parseInt(document.querySelector('.days-lable input').value) || 1;
    const price = parseFloat(document.querySelector('.amount-in-birr').textContent) || 0;
    const extra = parseFloat(document.querySelector('.extra-lable input').value) || 0;

    const total = (price * days) + extra;
    document.querySelector('.length-of-stay').textContent = `* ${days}`;
    document.querySelector('.answer-brr .answer').textContent = `${total}`;
}




/* Price calc */
document.querySelectorAll('.floor-input').forEach(input => {
    input.addEventListener('change', () => {
        const priceElement = input.closest('li').querySelector('.price');
        const price = parseFloat(priceElement?.textContent) || 0;

        // Set the current price
        document.querySelector('.amount-in-birr').textContent = price;

        // Recalculate final amount based on new price
        recalculateFinalAmount();
    });
});





// Function to show the popup for password input
function showRemovePopup(userData) {
    const modal = document.getElementById('removeCustomerModal');
    modal.style.display = 'block';

    document.querySelector('.information-customer .name').innerHTML = userData.name;
    document.querySelector('.information-customer .age').innerHTML = userData.age;
  //  document.querySelector('.information-customer .final-date').innerHTML = userData.finalDate;
    document.querySelector('.information-customer .payment-method').innerHTML = userData.selectedPayment;
    document.querySelector('.information-customer .room').innerHTML = userData.selectedRoom;
    document.querySelector('.information-customer .Price').innerHTML = userData.amountInBirr;

    


    // Close the popup when cancel button is clicked
    document.getElementById('cancelRemoveBtn').onclick = () => {
        modal.style.display = 'none';
    };
}