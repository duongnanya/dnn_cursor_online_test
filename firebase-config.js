// Firebase Configuration - Local development
const firebaseConfig = {
    apiKey: "AIzaSyBY_lzJj03AMY5msPIhHSi6s2jLzJXZ-jw",
    authDomain: "todo-5mins.firebaseapp.com",
    projectId: "todo-5mins",
    storageBucket: "todo-5mins.firebasestorage.app",
    messagingSenderId: "176286753890",
    appId: "1:176286753890:web:d1bd44d184ffa9a597dd3b"
};

// Export config để sử dụng trong các file khác
window.firebaseConfig = firebaseConfig;
console.log('Firebase config loaded from local file');
