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
