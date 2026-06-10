# Food Image Pipeline — Cài đặt & Sử dụng

Pipeline gồm 2 phần:
1. **Chrome Extension** — UI, đọc Google Sheet, chọn ảnh, upload Drive.
2. **Local server** (`image-server.ts`) — fetch ảnh → **xoá nền bằng InSPyReNet (local, GPU)** → ghép canvas trắng → trả về extension.

> Xoá nền giờ chạy **hoàn toàn local** bằng InSPyReNet — **không** dùng remove.bg, không captcha, không Chrome CDP, free & offline.

---

## PHẦN 1 — Chrome Extension

Extension ID cố định: **`koecopdkpomobckldfnijffedmgfiflc`** (pin bằng field `key` trong `manifest.json` → mọi máy load ra cùng ID).

### 1A. OWNER làm 1 lần (Google Cloud project)
1. **Bật API:** APIs & Services → Library → bật **Google Sheets API** + **Google Drive API**.
2. **OAuth client:** Credentials → OAuth client **type = Chrome Extension** → **Item ID = `koecopdkpomobckldfnijffedmgfiflc`**.
   - Nếu client cũ kiểu "Chrome App" không sửa được → tạo client mới kiểu Chrome Extension, copy `client_id` vào `src/manifest.json` (`oauth2.client_id`) rồi build lại.
3. **OAuth consent screen → User Type = Internal** → mọi tài khoản `@everfit.io` dùng ngay (không cần test user / verify). Chỉ bật được nếu project thuộc org everfit.io.

### 1B. Build & đóng gói
```bash
bun install
bun run build        # tạo dist/
```
Nén `dist/` thành `food-image-pipeline.zip` gửi teammate (hoặc dùng file zip có sẵn trong repo).

### 1C. Teammate cài (Load unpacked)
1. Giải nén zip ra 1 thư mục cố định (đừng xoá sau khi cài).
2. `chrome://extensions` → bật **Developer mode** → **Load unpacked** → chọn thư mục `dist`.
3. Extension hiện với ID `koecop…`. Mở side panel → đăng nhập Google (`@everfit.io`).

> Bản mới: ghi đè thư mục rồi bấm **Reload** ở trang extensions (ID giữ nguyên).

---

## PHẦN 2 — Local server xoá nền (BẮT BUỘC để dùng tính năng xoá nền)

Extension gọi tới `http://localhost:3456`. Server này phải **đang chạy** khi dùng extension.
(Không chạy server vẫn dùng được chế độ resize-only `skipBgRemoval`, nhưng sẽ KHÔNG xoá nền.)

### Yêu cầu
- **Bun** — cài: `curl -fsSL https://bun.sh/install | bash`
- **Python 3.9+** (macOS đã có sẵn `/usr/bin/python3`)
- **Apple Silicon** (M1–M4) để chạy GPU/MPS. Máy Intel vẫn chạy được nhưng bằng CPU (chậm hơn) — xem ghi chú cuối.

### 2A. Cài đặt (1 lần)
```bash
cd download_images_urls
bun install

# venv Python ARM64 (để PyTorch dùng GPU Apple Silicon) — ĐÚNG đường dẫn này:
arch -arm64 /usr/bin/python3 -m venv ~/inspyrenet-env
arch -arm64 ~/inspyrenet-env/bin/pip install -r requirements-bg.txt
```

### 2B. Chạy server
```bash
bun image-server.ts
```
- Lần chạy **đầu tiên**: tự tải model InSPyReNet (~vài trăm MB về `~/.u2net`-tương đương cache) + load model (~10s).
- `image-server.ts` **tự khởi động** `bg_server.py` (giữ model warm) và tự bật lại nếu nó chết.
- Sau đó mỗi ảnh ~**1.5–2s** (GPU MPS).

### 2C. Kiểm tra
```bash
curl http://localhost:3456/health
# {"status":"ok","engine":"inspyrenet","bgRemovalAvailable":true,...}
```
`bgRemovalAvailable: true` là sẵn sàng xoá nền.

### Lưu ý vận hành
- **Sau khi tắt terminal / khởi động lại máy** → phải chạy lại `bun image-server.ts`.
- Nếu extension báo *"Server chưa chạy. Chạy lệnh: bun image-server.ts"* → chạy lại lệnh đó.
- Đổi chất lượng/tốc độ: `BG_MODE=fast bun image-server.ts` (nhanh hơn, chất lượng kém hơn chút; mặc định `base` = đẹp nhất).
- **Máy Intel (không có MPS):** sửa `ensureBgServer` không cần `arch -arm64`, tạo venv thường (`python3 -m venv ~/inspyrenet-env`), và đặt `BG_DEVICE=cpu`. Tốc độ ~10s/ảnh.

---

## Ghi chú bảo mật
- `extension-key.pem` = private key ký extension → **giữ bí mật, không commit** (đã `.gitignore`). Chỉ cần khi đóng gói `.crx` / lên Chrome Web Store.
