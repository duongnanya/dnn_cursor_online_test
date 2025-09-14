# Web To-Do List Application

Ứng dụng quản lý danh sách công việc (To-Do List) được xây dựng bằng HTML, CSS và JavaScript thuần túy.

## Tính năng

- ✅ **Thêm công việc mới**: Nhập và thêm công việc vào danh sách
- ✅ **Đánh dấu hoàn thành**: Click vào checkbox để đánh dấu công việc đã hoàn thành
- ✅ **Xóa công việc**: Xóa từng công việc hoặc xóa tất cả công việc đã hoàn thành
- ✅ **Lọc công việc**: Xem tất cả, chưa hoàn thành, hoặc đã hoàn thành
- ✅ **Lưu trữ cục bộ**: Dữ liệu được lưu trong localStorage của trình duyệt
- ✅ **Giao diện đẹp**: Thiết kế hiện đại với hiệu ứng animation
- ✅ **Responsive**: Tương thích với mọi thiết bị
- ✅ **Thông báo**: Hiển thị thông báo khi thực hiện các thao tác

## Cách sử dụng

1. **Cấu hình Firebase** (tùy chọn):
   ```bash
   # Sao chép file config mẫu
   cp firebase-config.example.js firebase-config.js
   
   # Chỉnh sửa firebase-config.js với thông tin Firebase của bạn
   # Xem FIREBASE_SETUP.md để biết cách lấy config
   ```

2. **Chạy ứng dụng**:
   ```bash
   # Mở terminal trong thư mục dự án
   python3 -m http.server 8000
   
   # Hoặc sử dụng Node.js
   npx serve .
   
   # Sau đó mở trình duyệt và truy cập: http://localhost:8000
   ```

3. **Hoặc mở trực tiếp**: Mở file `index.html` trong trình duyệt

## Deploy lên GitHub Pages

Ứng dụng hỗ trợ nhiều phương án deploy:

### 🚀 **Phương án 1: GitHub Actions + Secrets** (Khuyến nghị)
- ✅ **Bảo mật cao**: Config Firebase từ GitHub Secrets
- ✅ **Tự động deploy**: Mỗi khi push code
- ✅ **Đầy đủ tính năng**: Firebase hoạt động hoàn hảo

### 🔧 **Phương án 2: Demo Mode**
- ✅ **Đơn giản**: Không cần setup gì
- ✅ **LocalStorage**: Dữ liệu lưu trên trình duyệt
- ⚠️ **Hạn chế**: Không có Firebase

Xem chi tiết: [GITHUB_PAGES_DEPLOY.md](GITHUB_PAGES_DEPLOY.md)

## Cấu trúc dự án

```
/workspace/
├── index.html              # Cấu trúc HTML chính
├── style.css               # Stylesheet cho giao diện
├── script.js               # Logic JavaScript
├── firebase-config.js      # Cấu hình Firebase (không commit)
├── firebase-config.example.js # Template cấu hình Firebase
├── FIREBASE_SETUP.md       # Hướng dẫn setup Firebase
├── GITHUB_PAGES_DEPLOY.md  # Hướng dẫn deploy GitHub Pages
├── GITHUB_SECRETS_SETUP.md # Hướng dẫn setup GitHub Secrets
├── .github/workflows/      # GitHub Actions workflows
├── .gitignore              # Danh sách file bỏ qua khi commit
└── README.md               # Tài liệu hướng dẫn
```

## Công nghệ sử dụng

- **HTML5**: Cấu trúc trang web
- **CSS3**: Styling và animations
- **JavaScript (ES6+)**: Logic ứng dụng
- **LocalStorage**: Lưu trữ dữ liệu cục bộ
- **Font Awesome**: Icons

## Tính năng chi tiết

### Thêm công việc
- Nhập nội dung công việc (tối đa 100 ký tự)
- Nhấn Enter hoặc click nút "+" để thêm
- Validation đầu vào và thông báo lỗi

### Quản lý công việc
- Click checkbox để đánh dấu hoàn thành/chưa hoàn thành
- Hover để hiển thị nút xóa
- Xóa từng công việc với xác nhận

### Bộ lọc
- **Tất cả**: Hiển thị tất cả công việc
- **Chưa hoàn thành**: Chỉ hiển thị công việc chưa hoàn thành
- **Đã hoàn thành**: Chỉ hiển thị công việc đã hoàn thành

### Lưu trữ
- Tự động lưu vào localStorage
- Khôi phục dữ liệu khi mở lại ứng dụng
- Xử lý lỗi khi không thể lưu/tải dữ liệu

## Trình duyệt hỗ trợ

- Chrome/Chromium 60+
- Firefox 60+
- Safari 12+
- Edge 79+

## License

MIT License - Tự do sử dụng cho mọi mục đích.