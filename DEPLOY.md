# Đưa Bi Bô Land lên mạng

Game gồm 4 phần chạy bằng Docker (web, API, MySQL và Caddy lo HTTPS), nên cách đơn giản nhất là thuê một máy chủ ảo (VPS) nhỏ rồi chạy đúng như trên máy bạn. Làm xong có địa chỉ `https://...` mở được trên mọi điện thoại, và nút “Thêm vào màn hình chính” (PWA) hoạt động.

> Lưu ý: Render không có MySQL (chỉ có Postgres) nên không đưa thẳng lên Render được. Railway, Fly.io hoặc VPS thì được; hướng dẫn dưới đây dùng VPS vì ít bước nhất.

## 1. Chuẩn bị (một lần)

1. Thuê VPS Ubuntu 22.04/24.04, từ 1 GB RAM (khoảng 4–6 USD/tháng; Hetzner, DigitalOcean, Vultr, Contabo, Oracle Free Tier đều được). Ghi lại **địa chỉ IP**.
2. Có tên miền thì trỏ bản ghi **A** về IP đó. Chưa có thì dùng tên miền miễn phí theo IP, ví dụ IP `203.0.113.10` → `203-0-113-10.sslip.io`.
3. Trong bảng điều khiển của nhà cung cấp, mở cổng **80** và **443** (và 22 để SSH).

## 2. Cài Docker trên VPS

```bash
ssh root@IP_CỦA_BẠN
curl -fsSL https://get.docker.com | sh
```

## 3. Đưa mã nguồn lên VPS

Từ máy bạn (PowerShell), nén thư mục dự án rồi chép lên (bỏ `node_modules` và `dist`):

```powershell
cd C:\Users\lienn\Downloads
tar --exclude=node_modules --exclude=dist --exclude=.env -czf vocab-world.tgz vocab-world
scp vocab-world.tgz root@IP_CỦA_BẠN:/root/
```

Trên VPS:

```bash
cd /root && tar xzf vocab-world.tgz && cd vocab-world
cp .env.example .env
nano .env        # điền DOMAIN, DB_PASSWORD, DB_ROOT_PASSWORD, EDITOR_KEY
```

Tạo mật khẩu ngẫu nhiên: `openssl rand -hex 24`.

## 4. Chạy

```bash
docker compose -f docker-compose.prod.yml up -d --build
docker compose -f docker-compose.prod.yml logs -f api   # chờ dòng "API đang chạy ở cổng 3000", rồi Ctrl+C
```

Lần đầu API nạp ~3.260 từ nên mất vài chục giây. Mở `https://DOMAIN_CỦA_BẠN` trên điện thoại; Caddy tự lấy chứng chỉ HTTPS (vài giây đến vài phút lần đầu).

## 5. Cập nhật sau này

Chép lại mã mới lên VPS (cùng cách bước 3) rồi chạy lại đúng lệnh ở bước 4. Dữ liệu người chơi nằm trong volume `dbdata` nên được giữ nguyên.

## Sao lưu

```bash
docker compose -f docker-compose.prod.yml exec db sh -c 'mysqldump -u root -p"$MYSQL_ROOT_PASSWORD" vocabworld' > backup.sql
```

## Lưu ý bảo mật

- Trang **Tạo nội dung** cần `EDITOR_KEY` (nhập trong trang đó); đừng chia sẻ khóa này.
- Game không có đăng nhập: tiến độ của mỗi người lưu theo trình duyệt/thiết bị của họ.
- Không công khai file `.env`; chỉ mở cổng 22, 80, 443 trên máy chủ.
