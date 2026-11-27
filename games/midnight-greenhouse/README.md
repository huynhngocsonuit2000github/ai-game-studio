# Nhà Kính Sau Nửa Đêm

Trò chơi phòng thủ bốn luống của AI Game Studio. Dùng một dòng nước để nuôi Bình Hứng Mưa hoặc nối tia Lan Sét, giữ Hạt Tim qua ba ca trực.

## Chơi bản thử

Mở [PR #35](https://github.com/huynhngocsonuit2000github/ai-game-studio/pull/35) để lấy gói `browser-evidence` của ứng viên. Giải nén `midnight-greenhouse-campaign.zip` bên trong và làm theo `PLAYTEST.txt`. Tệp này ghi SHA của ứng viên cùng SHA mà CI đã build.

Để build từ mã nguồn, dùng Node 24.22.3, pnpm 11.25.0 và Python 3. Chạy từ thư mục gốc của repo.

```sh
pnpm install --frozen-lockfile
pnpm --filter @studio/midnight-greenhouse build
python3 -m http.server 8089 --bind 127.0.0.1 --directory games/midnight-greenhouse/dist
```

Mở `http://127.0.0.1:8089/`, chọn **Vào nhà kính**, rồi **Chọn Sân Mưa**. Thắng mỗi màn để mở màn tiếp theo. Game lưu thành tích và cài đặt trên trình duyệt đang dùng.

## Điều khiển

- Chọn hạt giống rồi bấm hoặc chạm ô. Phím 1–6 chọn cây đang có. Dùng các phím mũi tên để di chuyển giữa ô và Enter hoặc Space để đặt.
- Chọn van bên trái để tưới một luống. Van cần 4 giây để chuyển nước lần nữa. Dấu `!` báo van sắp đóng, dấu `×` chỉ van đang đóng.
- Dùng **Tháo cây** để thu lại 25% giá. Esc bỏ chọn hoặc tạm dừng.
- Chơi ngang trên điện thoại. Mở **Cài đặt** để chỉnh nhạc, hiệu ứng, tắt tiếng hoặc giảm chuyển động.

## Chơi thử ba màn

1. **Sân Mưa.** Tưới Bình Hứng Mưa để kiếm Ánh Hạt, rồi chuyển nước sang Lan Sét lúc địch tụ lại. Dùng Dương Xỉ khi gặp Áo Mưa.
2. **Hầm Bơm.** Để một van đang tưới bị đóng, đổi sang luống khác rồi thử tưới lại khi van mở. Quan sát Rêu Thành và Nấm Vá.
3. **Đài Chớp.** Thử đổi luống ngay khi Thợ Vườn Gốm đánh dấu. Giữ nước tại chỗ ở lần cảnh báo kế tiếp để xem van bị khóa. Quan sát pha hai, hiệu ứng Lựu Cầu Chì và cảnh Hạt Tim nảy mầm.

[Bản thiết kế](design/GDD.md) · [Tiến độ và quyết định](production/PROGRESS.md) · [Kiểm thử và ảnh chụp](reports/QA_REPORT.md)
