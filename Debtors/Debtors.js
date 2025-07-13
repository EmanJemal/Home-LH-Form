import { database, ref, set, get, update, remove, onValue, child, push } from '../Script/firebase.js';
/*
const data = localStorage.getItem('Entering Pin');
if(data != 45284270810258310208532513043010152410200935993930){
 document.body.innerHTML = '<h1>You are not allowed</h1>'
}
*/
// Reference to the database
const dbRef = ref(database);

// Function to load customers into their respective floors and rooms
function loadCustomers() {
    get(child(dbRef, 'customers'))
        .then((snapshot) => {
            if (snapshot.exists()) {
                // Clear existing room data
                document.querySelectorAll('.debtors-list ul').forEach(ul => ul.innerHTML = '');

                snapshot.forEach((childSnapshot) => {
                    const customer = childSnapshot.val();
                    const paymentMethod = customer.paymentMethod; 
                    
                    // ✅ Only proceed if the payment method is 'debtors'
                    if (paymentMethod?.toLowerCase() !== 'debtors') {
                        return;
                    }                    
                
                    const roomNumber = customer.selectedRoom;
                    const days = customer.days;
                    const amountInBirr = customer.amountInBirr;
                    const finalDate = customer.finalDate;
                    const timeOnly = finalDate.split('2024-')[1];
                    const startingDate = customer.timestamp;                 
                    const customerName = customer.name;
                    const customerId = childSnapshot.key; // Get the customer ID
                
                    const dateAndTime = finalDate.split('T');
                    const date = dateAndTime[0]; // '2024-12-29'
                    const time = dateAndTime[1]; // '11:30'
                
                    // Split the date further to get the month and day
                    const dateParts = date.split('-');
                    const year = dateParts[0]; // '2024'
                    const month = dateParts[1]; // '12'
                    const day = dateParts[2]; // '29'
                
                    // Display the formatted result
                    const formattedDate = `${month}-${day} <i class="fa-solid fa-arrow-right"></i> ${time}`;
                                                    
                    let floor;
                
                    // Determine the floor based on room number
                    if (roomNumber.startsWith('1')) floor = '.debtors-list .floor-one-list ul';
                    else if (roomNumber.startsWith('2')) floor = '.debtors-list .floor-two-list ul';
                    else if (roomNumber.startsWith('3')) floor = '.debtors-list .floor-three-list ul';
                    else if (roomNumber.startsWith('4')) floor = '.debtors-list .floor-four-list ul';
                
                    const floorElement = document.querySelector(floor);
                
                    if (floorElement) {
                        const listItem = document.createElement('li');
                        listItem.innerHTML = `
                            ${roomNumber} <i class="fa-solid fa-arrow-right"></i> ${customerName}<i class="fa-solid fa-arrow-right fa-arrow-margin"></i>${days} Days
                            <i class="fa-solid fa-arrow-right"></i> ${paymentMethod}<i class="fa-solid fa-arrow-right fa-arrow-margin"></i>${amountInBirr} Birr
                            <span class="user-leaved"><i class="fa-solid fa-check"></i></span>
                        `;
                        floorElement.appendChild(listItem);
                
                        // Add event listener to the icon for showing the modal
                        listItem.querySelector('.user-leaved').addEventListener('click', () => {
                            showRemovePopup(customerId, roomNumber); // Pass roomNumber here
                        });
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

// Load customers on page load
window.onload = loadCustomers;


document.querySelector('.fa-check')
    .addEventListener('click', ()=>{
        
    })


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
    const paymentsRef = ref(database, 'Payments');
    const roomRef = ref(database, 'rooms/' + roomNumber); // Reference to the room
    
    // Update payment method for the customer
    const selectedValue = document.getElementById('payment-options').value;
    console.log(selectedValue);

    update(customerRef, { paymentMethod: selectedValue })
        .then(() => {
            // Find and update the corresponding payment entry
            return get(paymentsRef);
        })
        .then((snapshot) => {
            if (snapshot.exists()) {
                const payments = snapshot.val();
                for (const paymentId in payments) {
                    if (payments[paymentId].customerId === customerId) {
                        const specificPaymentRef = ref(database, `Payments/${paymentId}`);
                        return update(specificPaymentRef, { paymentMethod: selectedValue });
                    }
                    
                }
                throw new Error('No matching payment entry found for the customer');
            } else {
                throw new Error('No payment records found');
            }
        })
        .then(() => {
            console.log('Payment method updated, room removed successfully');
            loadCustomers(); // Reload the customer list after updates
        })
        .catch((error) => {
            console.error('Error updating payment method or removing room:', error);
        });


        
    
}
