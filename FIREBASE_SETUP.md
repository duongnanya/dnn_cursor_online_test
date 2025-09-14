# Hướng dẫn cấu hình Firebase

## Bước 1: Tạo dự án Firebase

1. Truy cập [Firebase Console](https://console.firebase.google.com/)
2. Nhấn "Tạo dự án" hoặc "Add project"
3. Đặt tên dự án (ví dụ: "todo-list-app")
4. Bật Google Analytics (tùy chọn)
5. Nhấn "Tạo dự án"

## Bước 2: Cấu hình Authentication

1. Trong Firebase Console, chọn "Authentication"
2. Nhấn "Bắt đầu"
3. Chọn tab "Sign-in method"
4. Bật "Google" provider
5. Nhập tên dự án và email hỗ trợ
6. Nhấn "Lưu"

## Bước 3: Cấu hình Firestore Database

1. Trong Firebase Console, chọn "Firestore Database"
2. Nhấn "Tạo cơ sở dữ liệu"
3. Chọn "Bắt đầu ở chế độ thử nghiệm" (để test)
4. Chọn vị trí (gần nhất với bạn)
5. Nhấn "Bật"

## Bước 4: Lấy cấu hình Firebase

1. Trong Firebase Console, chọn biểu tượng bánh răng ⚙️
2. Chọn "Cài đặt dự án"
3. Cuộn xuống "SDK của bạn"
4. Chọn "Cấu hình" (Config)
5. Sao chép object `firebaseConfig`

## Bước 5: Cập nhật cấu hình trong code

Mở file `index.html` và thay thế phần cấu hình Firebase:

```javascript
const firebaseConfig = {
    apiKey: "your-actual-api-key",
    authDomain: "your-project.firebaseapp.com",
    projectId: "your-actual-project-id",
    storageBucket: "your-project.appspot.com",
    messagingSenderId: "your-actual-sender-id",
    appId: "your-actual-app-id"
};
```

## Bước 6: Cấu hình quyền Firestore (Tùy chọn)

Để bảo mật hơn, bạn có thể cập nhật quy tắc Firestore:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Chỉ cho phép user đọc/ghi dữ liệu của chính họ
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

## Lưu ý quan trọng

- **API Key**: Có thể public, Firebase sẽ tự động bảo mật
- **Project ID**: Cần chính xác để kết nối đúng dự án
- **Domain**: Cần thêm domain của bạn vào "Authorized domains" trong Authentication settings
- **Quy tắc Firestore**: Mặc định cho phép đọc/ghi, nên cập nhật cho production

## Test chức năng

1. Mở ứng dụng trong trình duyệt
2. Nhấn "Đăng nhập bằng Google"
3. Chọn tài khoản Google
4. Kiểm tra dữ liệu được lưu trong Firestore Console
5. Thử tạo/sửa/xóa todo để test đồng bộ
