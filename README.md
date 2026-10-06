# Bi Bô Land (Vocabulary World)

Game học từ vựng tiếng Anh qua các thế giới tương tác: bước vào một thế giới (At Home, At the Café, Shopping, School, Travel…), nói chuyện với nhân vật, xử lý tình huống theo ngữ cảnh, nhận thẻ **NEW WORD** khi lần đầu dùng đúng một từ, và gom từ vào **Túi từ**. Từ đã gặp ở thế giới trước sẽ được nhận ra khi gặp lại ở thế giới sau (không giải thích lại).

Công nghệ: React + Vite (web), Node.js + Express (API), MySQL 8. Không có tài khoản/đăng nhập: tiến độ lưu theo mã ẩn danh của từng trình duyệt.

## Chạy bằng Docker

```bash
cp .env.example .env      # rồi sửa DB_PASSWORD, DB_ROOT_PASSWORD, EDITOR_KEY
docker compose up -d --build
```

Mở http://localhost:8080. Lần chạy đầu tự tạo bảng và nạp **83 thế giới mẫu**:

- 5 thế giới gốc (At Home, At the Café, Shopping, School, Travel): phần soạn tay 12 từ/thế giới, được **mở rộng lên 40 từ mỗi thế giới** bằng 4 cảnh mới trong `server/content/21-extend-start.txt` (tên thế giới trùng tên thế giới gốc thì nội dung được thêm vào thế giới đó, không tạo thế giới mới; CSDL cũ cũng được thêm và giữ nguyên tiến độ);
- 78 thế giới theo chủ đề trong `server/content/*.txt`: **3.120 từ không trùng nhau** (cộng 200 từ của 5 thế giới gốc: tổng **3.260 từ**) (trình độ A1-B1), mỗi thế giới 40 từ, 4 cảnh, 60 tình huống, chia thành 12 nhóm (Đời sống, Ăn uống, Con người, Sức khỏe, Học tập, Công việc, Thành phố & du lịch, Thiên nhiên, Giải trí, Công nghệ & khoa học, Xã hội, Ngôn ngữ cốt lõi).

**Nâng cấp từ bản cũ:** chỉ cần `docker compose up -d --build`. CSDL cũ được giữ nguyên (kể cả tiến độ người chơi và thế giới bạn tự tạo); máy chủ tự thêm cột mới và nạp thêm 78 thế giới. Mỗi thế giới mẫu chỉ nạp một lần (ghi trong bảng `seed_log`), nên thế giới bạn đã sửa hoặc đã xóa sẽ không bị nạp đè lại. Đặt `SEED_PACKS=0` cho dịch vụ `api` nếu chỉ muốn 5 thế giới gốc.

Đưa lên mạng: đặt `EDITOR_KEY` (nếu không, ai vào trang cũng sửa được nội dung) và đặt HTTPS phía trước (Caddy, Cloudflare…, khi đó `TRUST_PROXY=2`).

## Chạy khi phát triển

```bash
# API (cần MySQL đã tạo sẵn CSDL và người dùng)
cd server && npm install
DB_HOST=127.0.0.1 DB_USER=vocab DB_PASSWORD=... DB_NAME=vocabworld npm run dev
# Web
cd web && npm install && npm run dev      # http://localhost:5173 (proxy /api sang :3000)
```

Test API (dùng CSDL riêng, **test xóa dữ liệu của CSDL đó**): `DB_NAME=vocabtest ... npm test`. Bộ test cũng kiểm tra toàn bộ gói từ vựng: đủ 3.120 từ (và 140 từ mở rộng của 5 thế giới gốc), không trùng, mỗi tình huống có đúng 1 đáp án đúng trong 4 đáp án, câu hỏi không lộ đáp án.

## Cách chơi

1. Chọn thế giới ở bản đồ (lọc theo nhóm chủ đề, trình độ A1/A2/B1, tiến độ, hoặc gõ tên để tìm). 2. Chạm nhân vật/vật trong cảnh (chấm vàng = còn tình huống). 3. Đọc bối cảnh (có nút 🔊), chọn đáp án phù hợp nhất (bấm phím 1-4 để chọn nhanh, Enter để sang câu tiếp). 4. Đúng lần đầu: thẻ NEW WORD (nghĩa, IPA, ví dụ, nghe phát âm). 5. Xong mọi tình huống: màn tổng kết (từ đã gặp / mới / dùng lại).

Ở các thế giới theo chủ đề, mỗi cảnh có 3 nhân vật/vật (mỗi từ một tình huống gợi ý bằng tiếng Anh) và một **Challenge board** 🎯 để ôn lại 5 từ của cảnh (điền từ vào câu, chọn nghĩa tiếng Việt). Cứ gặp 25 từ thì lên một cấp (hiện ở góc trên bên phải).

Thẻ từ chỉ hiện đầy đủ (nghĩa, IPA, ví dụ) **sau khi** người chơi gặp từ đó; đáp án đúng chỉ được kiểm tra ở máy chủ.

## Tạo nội dung (menu “Tạo nội dung”)

- **Generate World**: nhập chủ đề + danh sách từ (`từ | nghĩa | câu ví dụ`, nghĩa/ví dụ có thể bỏ trống nếu từ đã có ở thế giới khác). Hệ thống dùng mẫu có sẵn (không gọi AI ngoài) dựng cảnh, nhân vật, tình huống; xem trước, tạo lại, rồi lưu thành **bản nháp**.
- Sửa thế giới, từ vựng, cảnh, nhân vật/vật, tình huống, đáp án; đổi thứ tự cảnh.
- **Xuất bản** chỉ khi hợp lệ (mỗi cảnh có tình huống, mỗi tình huống đúng 1 đáp án đúng, ≥2 đáp án, không trùng). Nếu sửa làm thế giới đang xuất bản không còn hợp lệ, nó tự về bản nháp. Chỉ nội dung đã xuất bản mới hiện trong game.

Bản mẫu tạo từ mẫu cố định, nên câu chữ khá đơn giản: hãy đọc và chỉnh lại trước khi xuất bản.

### Gói từ vựng (`server/content/*.txt`)

Mỗi file chứa vài thế giới, mỗi dòng một mục, các trường cách nhau bằng ` | `:

```
# Tên thế giới | emoji | #màu | nhóm | trình độ | mô tả
## Tên cảnh | emoji nền | mô tả cảnh
@ Tên nhân vật | emoji | lời thoại            (@@ = đồ vật)
từ | IPA | loại từ | nghĩa tiếng Việt | câu ví dụ | gợi ý tình huống bằng tiếng Anh (không chứa chính từ đó)
```

`nhóm` là một trong: life, food, people, health, school, work, travel, nature, fun, tech, society, core. `loại từ`: n, v, adj, adv, prep, phr, pron, conj, num, det, int. Khi khởi động, `server/src/packs.js` dựng mỗi từ thành một tình huống gợi ý (đáp án gây nhiễu lấy từ cùng cảnh, tránh các từ gần nghĩa) và thêm câu ôn ở Challenge board. Thêm file mới với tên thế giới mới thì lần khởi động sau sẽ được nạp; thế giới đã nạp rồi thì sửa trong trang “Tạo nội dung”, không sửa lại bằng file.

IPA theo giọng Mỹ và do người soạn ghi, không lấy từ từ điển nào; nếu thấy chỗ chưa chuẩn, sửa trong tab “Từ vựng” của thế giới đó.

## API chính

Người chơi (header `X-Player-Id`): `GET /api/worlds`, `GET /api/worlds/:id`, `POST /api/situations/:id/answer {optionId}`, `GET /api/worlds/:id/summary`, `GET /api/bag`, `DELETE /api/progress`.
Tạo nội dung (header `X-Editor-Key` nếu có `EDITOR_KEY`): `/api/creator/status|worlds|worlds/:id|vocabulary|scenes|items|situations|…/check|publish|unpublish|generate|import`.

## Giao diện

Phong cách “bút chì hoạt hình”: nền giấy kẻ ô, viền đậm hơi lệch như vẽ tay, tô màu chì, hiệu ứng lắc nhẹ; phông Itim + Mali và bộ biểu tượng nét vẽ đơn sắc Noto Emoji (đóng gói sẵn trong app qua @fontsource, không cần mạng; biểu tượng được ép sang dạng nét vẽ bằng `web/src/emoji.js`). Toàn bộ kiểu dáng nằm trong `web/src/styles.css`; màu riêng của từng thế giới lấy từ trường “Màu” của thế giới đó.

## Giọng đọc

Dùng Web Speech API của trình duyệt (giọng tùy máy; Chrome/Edge/Safari thường có sẵn giọng en-US).

## Ôn tập và chơi lại

Mỗi thế giới có nút **📒 Ôn lại** (không có menu Ôn tập riêng). Bấm vào sẽ chọn một trong 5 trò ôn các từ bạn đã gặp của thế giới đó: **Trắc nghiệm** (chọn nghĩa, chọn từ, nghe rồi chọn, điền từ vào câu), **Thẻ lật**, **Ghép cặp**, **Nghe và gõ**, **Xếp chữ**. Từ trả lời sai được hỏi lại nhiều hơn (lưu trong trình duyệt); cuối lượt có danh sách từ cần nhớ thêm và nút “Ôn lại từ sai”.

**Chơi lại / ôn lại từng thế giới:** trong mỗi thế giới có hai nút ở trên cùng: “📒 Ôn lại” (đề ôn chỉ gồm các từ bạn đã gặp của thế giới đó, `/review?world=ID`) và “↺ Chơi lại” (hiện popup hỏi lại, rồi xóa tiến độ thế giới đó để chơi từ đầu; từ đã gặp vẫn ở trong túi từ; API: `DELETE /api/worlds/:id/progress`). Trang tổng kết cũng có hai nút này.

**Phiên âm:** toàn bộ phiên âm theo IPA Anh-Mỹ (oʊ, ər, ɑː…), hiện kèm nhãn **US** ở thẻ từ, túi từ, trang tổng kết và bài ôn tập; nút 🔊 đọc bằng giọng en-US của trình duyệt.

**Chơi liền mạch:** khi trả lời đúng và bấm “Tiếp tục” trên thẻ NEW WORD, game tự chuyển tới tình huống chưa giải kế tiếp (cùng nhân vật/vật, rồi vật kế tiếp, rồi cảnh kế tiếp) và sang trang tổng kết khi xong thế giới.

**Xem từ vựng trước khi chơi:** bấm vào một thế giới trên bản đồ sẽ mở màn **sổ từ vựng** (`/world/:id/intro`): các từ hiện như ghi chú dán trên bảng, chia theo cảnh, có phiên âm US, nghĩa, nút 🔊; bấm vào ghi chú để xem câu ví dụ; có ô tìm kiếm và chế độ “Che nghĩa để tự thử”. Nút “Vào thế giới” để bắt đầu chơi; trong lúc chơi có nút “📖 Từ vựng” để mở lại. API: `GET /api/worlds/:id/words`.

**Đưa lên mạng:** xem `DEPLOY.md` (VPS + Docker + Caddy tự cấp HTTPS, dùng `docker-compose.prod.yml`).
