import {
    auth,
    signInWithEmailAndPassword,
    onAuthStateChanged
  } from '../../Script/firebase.js';
  
  const loginForm = document.getElementById('admin-login-form');
  
  // 🔒 Handle Login
  loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = loginForm.email.value.trim();
    const password = loginForm.password.value.trim();
  
    signInWithEmailAndPassword(auth, email, password)
      .then(({ user }) => {
        console.log('✅ Logged in as:', user.uid);
        // ✅ All authenticated users are admins
        window.location.href = '../index.html';
      })
      .catch(error => {
        console.error('❌ Login failed:', error);
        alert('Login failed: ' + error.message);
      });
  });
  
  // 🔁 Auto-redirect if already signed in
  onAuthStateChanged(auth, (user) => {
    if (user) {
      console.log('🔁 Already signed in:', user.uid);
      window.location.href = '../../Admin-Panel/Overview/overview.html';
    }
  });
  