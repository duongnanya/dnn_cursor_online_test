// Firebase Configuration Template
// Sao chép file này thành firebase-config.js và thay thế các giá trị
const firebaseConfig = {
    apiKey: "your-api-key-here",
    authDomain: "your-project.firebaseapp.com",
    projectId: "your-project-id",
    storageBucket: "your-project.appspot.com",
    messagingSenderId: "your-sender-id",
    appId: "your-app-id"
};

// Export config để sử dụng trong các file khác
window.firebaseConfig = firebaseConfig;
