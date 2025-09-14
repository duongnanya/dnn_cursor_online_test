# Hướng dẫn Setup GitHub Secrets cho Firebase

## Tổng quan

GitHub Actions sẽ tự động inject Firebase config từ GitHub Secrets vào file `firebase-config.js` khi deploy.

## Bước 1: Lấy Firebase Config

1. Truy cập [Firebase Console](https://console.firebase.google.com/)
2. Chọn project của bạn
3. Click biểu tượng bánh răng ⚙️ → **Project settings**
4. Cuộn xuống **Your apps** → **Web apps**
5. Click **Config** để xem cấu hình

```javascript
const firebaseConfig = {
  apiKey: "AIzaSyBY_lzJj03AMY5msPIhHSi6s2jLzJXZ-jw",
  authDomain: "todo-5mins.firebaseapp.com",
  projectId: "todo-5mins",
  storageBucket: "todo-5mins.firebasestorage.app",
  messagingSenderId: "176286753890",
  appId: "1:176286753890:web:d1bd44d184ffa9a597dd3b"
};
```

## Bước 2: Thêm GitHub Secrets

1. Vào repository trên GitHub
2. Click **Settings** tab
3. Trong sidebar, click **Secrets and variables** → **Actions**
4. Click **New repository secret**

**Lưu ý**: Tên secrets phải chính xác như bảng dưới đây (không có dấu gạch dưới)

### Thêm các secrets sau:

| Secret Name | Value | Ví dụ |
|-------------|-------|-------|
| `APIKEY` | API Key từ config | `AIzaSyBY_lzJj03AMY5msPIhHSi6s2jLzJXZ-jw` |
| `AUTHDOMAIN` | Auth Domain | `todo-5mins.firebaseapp.com` |
| `PROJECTID` | Project ID | `todo-5mins` |
| `STORAGEBUCKET` | Storage Bucket | `todo-5mins.firebasestorage.app` |
| `MESSAGINGSENDERID` | Messaging Sender ID | `176286753890` |
| `APPID` | App ID | `1:176286753890:web:d1bd44d184ffa9a597dd3b` |

## Bước 3: Cấu hình Firebase Console

### Authentication Settings
1. Vào **Authentication** → **Settings** → **Authorized domains**
2. Thêm domain GitHub Pages: `yourusername.github.io`
3. Thêm domain repository: `yourusername.github.io/repository-name`

### Firestore Rules (Tùy chọn)
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

## Bước 4: Test Deployment

1. Push code lên GitHub:
```bash
git add .
git commit -m "feat: thêm GitHub Actions với Firebase secrets"
git push origin main
```

2. Kiểm tra GitHub Actions:
   - Vào **Actions** tab trong repository
   - Xem workflow **Deploy to GitHub Pages**
   - Đợi deployment hoàn thành

3. Truy cập GitHub Pages:
   - URL: `https://yourusername.github.io/repository-name`
   - Kiểm tra console để xem Firebase config đã được inject

## Troubleshooting

### Lỗi "Firebase config not found"
- Kiểm tra GitHub Secrets đã được thêm đúng chưa
- Xem GitHub Actions logs để debug

### Lỗi đăng nhập
- Kiểm tra Authorized domains trong Firebase Console
- Đảm bảo domain GitHub Pages đã được thêm

### Lỗi Firestore permissions
- Kiểm tra Firestore rules
- Đảm bảo user đã đăng nhập

## Bảo mật

### ✅ An toàn:
- Secrets được mã hóa trong GitHub
- Chỉ có quyền truy cập repository mới thấy
- Config chỉ được tạo trong quá trình build

### ⚠️ Lưu ý:
- Không commit secrets vào code
- Sử dụng Firestore rules chặt chẽ
- Giới hạn domain trong Firebase Console

## Kết quả

Sau khi setup xong:
- ✅ **Local**: Sử dụng `firebase-config.js` riêng
- ✅ **GitHub Pages**: Tự động inject config từ secrets
- ✅ **Bảo mật**: Config không bị lộ trong code
- ✅ **Tự động**: Deploy mỗi khi push code

## So sánh các phương án

| Phương án | Bảo mật | Tự động | Phức tạp |
|-----------|---------|---------|----------|
| Demo Mode | ⭐⭐⭐ | ⭐⭐⭐ | ⭐ |
| Public Config | ⭐ | ⭐⭐⭐ | ⭐ |
| **GitHub Secrets** | ⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐ |

**GitHub Secrets** là phương án tốt nhất cho production!
