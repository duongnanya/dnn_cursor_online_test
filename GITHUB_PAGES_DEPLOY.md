# Hướng dẫn Deploy lên GitHub Pages

## Cách hoạt động

Ứng dụng được thiết kế để hoạt động trên cả **local development** và **GitHub Pages**:

### 🔧 Local Development
- Sử dụng `firebase-config.js` (file riêng, không commit)
- Đầy đủ tính năng Firebase (đăng nhập, đồng bộ dữ liệu)

### 🌐 GitHub Pages
- Tự động fallback sang **Demo Mode** khi không có `firebase-config.js`
- Chỉ sử dụng localStorage (không có Firebase)
- Vẫn hoạt động đầy đủ các tính năng cơ bản

## Cách Deploy

### Bước 1: Push code lên GitHub
```bash
# Add các file cần thiết
git add index.html script.js style.css README.md .gitignore firebase-config.example.js FIREBASE_SETUP.md

# Commit
git commit -m "feat: thêm hỗ trợ GitHub Pages với demo mode"

# Push
git push origin main
```

### Bước 2: Bật GitHub Pages
1. Vào repository trên GitHub
2. Click **Settings** tab
3. Cuộn xuống **Pages** section
4. Chọn **Source**: Deploy from a branch
5. Chọn **Branch**: main
6. Click **Save**

### Bước 3: Truy cập ứng dụng
- URL sẽ là: `https://yourusername.github.io/repository-name`
- Ứng dụng sẽ tự động chạy ở **Demo Mode**

## Demo Mode Features

### ✅ Hoạt động bình thường:
- Thêm/sửa/xóa todo
- Cấu trúc phân cấp cha-con
- Tìm kiếm và lọc
- Lưu trữ localStorage
- Responsive design
- Phím tắt

### ⚠️ Bị vô hiệu hóa:
- Đăng nhập Google
- Đồng bộ Firebase
- Lưu trữ đám mây

## Cách thêm Firebase cho GitHub Pages

Nếu muốn sử dụng Firebase trên GitHub Pages:

### Phương án 1: Tạo Firebase config public
```javascript
// Tạo file firebase-config-public.js
const firebaseConfig = {
    apiKey: "your-public-api-key",
    authDomain: "your-project.firebaseapp.com",
    projectId: "your-project-id",
    storageBucket: "your-project.appspot.com",
    messagingSenderId: "your-sender-id",
    appId: "your-app-id"
};

window.firebaseConfig = firebaseConfig;
```

### Phương án 2: Sử dụng Environment Variables ✅ **KHUYẾN NGHỊ**
- Sử dụng GitHub Actions để inject config từ GitHub Secrets
- Bảo mật cao, tự động deploy
- Xem chi tiết: [GITHUB_SECRETS_SETUP.md](GITHUB_SECRETS_SETUP.md)

### Phương án 3: Tạo Firebase project riêng cho demo
- Tạo project Firebase mới cho demo
- Config public (có thể commit)
- Giới hạn quyền truy cập

## Lưu ý bảo mật

### ✅ An toàn:
- API Key Firebase có thể public (Firebase tự bảo mật)
- Project ID có thể public
- Domain restrictions trong Firebase Console

### ⚠️ Cần cẩn thận:
- Không commit private keys
- Cấu hình Firestore rules chặt chẽ
- Giới hạn domain trong Firebase Console

## Troubleshooting

### Lỗi "Firebase config not found"
- Kiểm tra file `firebase-config.js` có tồn tại không
- Ứng dụng sẽ tự động chuyển sang demo mode

### Lỗi đăng nhập trên GitHub Pages
- Bình thường trong demo mode
- Cần cấu hình Firebase domain cho GitHub Pages

### Dữ liệu không đồng bộ
- Demo mode chỉ lưu localStorage
- Cần Firebase config để đồng bộ đám mây

## Kết luận

Giải pháp này cho phép:
- ✅ **Local development**: Đầy đủ tính năng với Firebase
- ✅ **GitHub Pages**: Demo mode hoạt động ổn định
- ✅ **Bảo mật**: Config Firebase không bị lộ
- ✅ **Linh hoạt**: Dễ dàng thêm Firebase cho production
