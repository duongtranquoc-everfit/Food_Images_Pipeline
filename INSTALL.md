# Cài đặt Food Image Pipeline (sideload — Cách A)

Extension ID cố định: **`koecopdkpomobckldfnijffedmgfiflc`**
(ID này được pin bằng field `key` trong `manifest.json` → mọi máy load đều ra cùng ID.)

---

## A. Phần OWNER làm 1 lần (trong Google Cloud project)

1. **Bật API:** APIs & Services → Library → bật **Google Sheets API** và **Google Drive API**.
2. **OAuth client:** APIs & Services → Credentials → tạo / sửa OAuth client **type = Chrome Extension**:
   - **Item ID = `koecopdkpomobckldfnijffedmgfiflc`**
   - (Nếu client cũ là kiểu "Chrome App" không sửa được → tạo client mới kiểu Chrome Extension, copy `client_id` mới vào `src/manifest.json` → `oauth2.client_id` rồi build lại.)
3. **OAuth consent screen → User Type = Internal**
   - Mọi tài khoản `@everfit.io` dùng được ngay, không cần thêm test user, không cần Google verify.
   - (Chỉ bật Internal được nếu project thuộc tổ chức Workspace everfit.io.)

## B. Phần OWNER đóng gói gửi teammate

```bash
bun install
bun run build        # tạo thư mục dist/
```
Nén thư mục `dist/` thành `food-image-pipeline.zip` và gửi cho teammate (hoặc để trên Drive).

## C. Phần TEAMMATE cài trên máy họ

1. Giải nén zip ra 1 thư mục cố định (đừng xoá sau khi cài).
2. Mở Chrome → địa chỉ `chrome://extensions`.
3. Bật **Developer mode** (góc trên phải).
4. Bấm **Load unpacked** → chọn thư mục `dist` vừa giải nén.
5. Extension xuất hiện với ID `koecopdkpomobckldfnijffedmgfiflc`. Mở side panel → đăng nhập Google (`@everfit.io`) → dùng.

> Khi có bản mới: owner gửi zip mới, teammate ghi đè thư mục cũ rồi bấm **Reload** ở trang extensions.

---

## Ghi chú bảo mật
- File `extension-key.pem` là **private key ký extension** → giữ bí mật, **không commit, không gửi cho ai**. Đã được `.gitignore` chặn.
- Chỉ cần private key này nếu sau muốn đóng gói `.crx` hoặc đưa lên Chrome Web Store. Để "Load unpacked" thì chỉ cần field `key` trong manifest (đã có sẵn).
