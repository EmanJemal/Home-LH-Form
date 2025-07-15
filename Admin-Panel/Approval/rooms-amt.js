import { 
    auth, database, ref, set, get, update, remove, onValue, child, push, 
    signInWithEmailAndPassword, onAuthStateChanged, signOut 
  } from '../../Script/firebase.js';
  
// Now `auth` is defined and ready to use

const loginForm = document.getElementById('admin-login-form');
const adminPanel = document.getElementById('admin-panel');  // You don't have this div in your HTML yet, create it or adjust accordingly
const logoutBtn = document.getElementById('logout-btn');    // Same here — make sure logout button exists

// Login handler
loginForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const email = loginForm.email.value;
  const password = loginForm.password.value;

  signInWithEmailAndPassword(auth, email, password)
    .then(({ user }) => {
      console.log('Logged in:', user.uid);
      checkAdmin(user.uid);
    })
    .catch(error => {
      alert('Login failed: ' + error.message);
    });
});

// Logout handler
if (logoutBtn) {
  logoutBtn.addEventListener('click', () => {
    signOut(auth).then(() => {
      adminPanel.style.display = 'none';
      loginForm.style.display = 'block';
    });
  });
}

function checkAdmin(uid) {
  get(child(ref(database), `admins/${uid}`))
    .then(snapshot => {
      if (snapshot.exists()) {
        adminPanel.style.display = 'block';
        loginForm.style.display = 'none';
      } else {
        alert('Access denied: You are not an admin.');
        signOut(auth);
      }
    })
    .catch(err => {
      console.error('Error checking admin status:', err);
      alert('Error checking admin status');
    });
}

onAuthStateChanged(auth, user => {
  if (user) {
    checkAdmin(user.uid);
  } else {
    if (adminPanel) adminPanel.style.display = 'none';
    if (loginForm) loginForm.style.display = 'block';
  }
});

  
// Reference to the database
const dbRef = ref(database);

// Handle Submit Button Click
document.getElementById('submit-change').addEventListener('click', () => {
    // Get values from inputs
    const deluxeAmount = document.querySelector('.deluxe-amount').value;
    const standardAmount = document.querySelector('.standard-amount').value;
    const singleAmount = document.querySelector('.single-amount').value;
    const doubleAmount = document.querySelector('.double-amount').value;

    // Validate Inputs
    if (!deluxeAmount || !standardAmount || !singleAmount || !doubleAmount) {
        alert('Please fill in all the amounts before submitting.');
        return;
    }

    // Prepare data to be saved
    const pricingData = {
        deluxe: parseFloat(deluxeAmount),
        standard: parseFloat(standardAmount),
        single: parseFloat(singleAmount),
        double: parseFloat(doubleAmount),
        timestamp: Date.now()
    };

    // Save data to Firebase under 'roomPricing'
    set(ref(database, 'roomPricing'), pricingData)
        .then(() => {
            alert('Pricing details saved successfully!');
            // Optionally clear the inputs
            document.querySelector('.deluxe-amount').value = '';
            document.querySelector('.standard-amount').value = '';
            document.querySelector('.single-amount').value = '';
            document.querySelector('.double-amount').value = '';
        })
        .catch((error) => {
            console.error('Error saving data:', error);
            alert('Failed to save pricing details. Please try again.');
        });
});





document.getElementById('submit-change-rooms-detail').addEventListener('click', function () {
    // Get all selected radio buttons
    const selectedRooms = document.querySelectorAll('input[type="radio"]:checked');
    
    if (selectedRooms.length === 0) {
        alert('Please select at least one room before submitting.');
        return;
    }

    // Collect room details into an object
    const registeredRooms = {};

    selectedRooms.forEach(room => {
        const roomItem = room.closest('li'); // Find the closest li parent

        const roomNumber = room.value; // Get room number from radio button
        const roomTypeDropdown = roomItem.querySelector('.room-type'); // Get dropdown
        const roomAmountInput = roomItem.querySelector('.room'); // Get amount input

        // Add to object with roomNumber as key
        registeredRooms[roomNumber] = {
            roomNumber: roomNumber,
            roomType: roomTypeDropdown ? roomTypeDropdown.value : 'N/A',
            roomAmount: roomAmountInput ? roomAmountInput.value : 'N/A'
        };
    });

    // Update instead of set to prevent overwriting existing data
    update(ref(database, `eachRoomsPricing`), registeredRooms)
    .then(() => {
        alert(`Successfully registered ${Object.keys(registeredRooms).length} room(s). Check the console for details.`);
    })
    .catch((error) => {
        console.error('Error updating rooms:', error);
        alert('Failed to register rooms. Check the console for details.');
    });

    // Log registered rooms
    console.log('Registered Rooms:', registeredRooms);
});



// Fetch both room details and default pricing
Promise.all([
    get(child(dbRef, "eachRoomsPricing")),
    get(child(dbRef, "roomPricing"))
]).then(([roomsSnapshot, pricingSnapshot]) => {
    if (roomsSnapshot.exists() && pricingSnapshot.exists()) {
        const roomData = roomsSnapshot.val();
        const roomPricing = pricingSnapshot.val();

        console.log("Room Data:", roomData); 
        console.log("Room Pricing:", roomPricing);

        // Loop through each room in the data
        Object.keys(roomData).forEach(roomNumber => {
            const roomInfo = roomData[roomNumber];
            
            // Find the corresponding input and select element by matching room number
            const roomInput = document.querySelector(`input[value="${roomNumber}"]`);
            
            if (roomInput) {
                // Get the parent <li> element to access related elements
                const roomLi = roomInput.closest('li');
                
                // Set Room Type
                const roomTypeSelect = roomLi.querySelector('.room-type');
                if (roomTypeSelect) {
                    roomTypeSelect.value = roomInfo.roomType || "Deluxe"; // Default to 'Deluxe' if empty
                }
                
                // Set Room Amount
                const roomAmountInput = roomLi.querySelector('input[type="text"]');
                if (roomAmountInput) {
                    if (roomInfo.roomAmount && roomInfo.roomAmount.trim() !== "") {
                        // If roomAmount exists, use it
                        roomAmountInput.value = roomInfo.roomAmount;
                    } else {
                        // If roomAmount is empty, fetch price based on roomType
                        const roomType = roomInfo.roomType ? roomInfo.roomType.toLowerCase() : "deluxe";
                        const defaultPrice = roomPricing[roomType] || "Not Set";
                        roomAmountInput.value = defaultPrice;
                        roomAmountInput.placeholder = defaultPrice === "Not Set" ? "Enter the amount" : "";
                    }
                }
            }
        });
    } else {
        console.log("No room data or pricing data available");
    }
}).catch((error) => {
    console.error("Error fetching data:", error);
});




// Fetch room pricing data
get(child(dbRef, "roomPricing"))
    .then((pricingSnapshot) => {
        if (pricingSnapshot.exists()) {
            const roomPricing = pricingSnapshot.val();

            console.log("Room Pricing:", roomPricing);

            // Map prices to respective input fields
            const deluxeInput = document.querySelector('.deluxe-amount');
            const standardInput = document.querySelector('.standard-amount');
            const singleInput = document.querySelector('.single-amount');
            const doubleInput = document.querySelector('.double-amount');

            if (deluxeInput) deluxeInput.value = roomPricing.deluxe || "";
            if (standardInput) standardInput.value = roomPricing.standard || "";
            if (singleInput) singleInput.value = roomPricing.single || "";
            if (doubleInput) doubleInput.value = roomPricing.double || "";
        } else {
            console.log("No pricing data available");
        }
    })
    .catch((error) => {
        console.error("Error fetching pricing data:", error);
    });