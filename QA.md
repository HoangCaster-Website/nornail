# Kiểm tra bàn giao

Đã kiểm tra lại bản thiết kế theo hướng Townhouse bằng Chromium trên giao diện desktop và điện thoại, ngày 21/10/2026.

| Chiều rộng | Tràn ngang | Ảnh lỗi | Lỗi JavaScript | Liên kết nội bộ lỗi |
| --- | --- | --- | --- | --- |
| 1440 px | Không | Không | Không | Không |
| 768 px | Không | Không | Không | Không |
| 390 px | Không | Không | Không | Không |
| 360 px | Không | Không | Không | Không |
| 320 px | Không | Không | Không | Không |

Đã kiểm tra nút chuyển danh mục/sản phẩm và mở/thu gọn toàn bộ sản phẩm. Đã thao tác bộ lọc, tìm kiếm có kết quả/không kết quả, mở chi tiết từ sản phẩm và danh mục, chuyển từ tìm kiếm sang sản phẩm, đóng dialog bằng nút và Escape, câu hỏi thường gặp, mở/đóng menu điện thoại và chọn liên kết liên hệ. Đã kiểm tra liên kết hỏi giá có đúng email, sản phẩm và nội dung điền sẵn. Đã kiểm tra cú pháp JavaScript, tài nguyên nội bộ và ID HTML không trùng.

Đã xem ảnh chụp desktop/mobile và kiểm tra hiệu ứng xuất hiện nội dung, hỗ trợ reduced motion và mở khóa cuộn sau khi đóng dialog.

Chưa thực hiện gửi email, gọi điện, thanh toán hay xuất bản. Liên kết email mở ứng dụng email của người dùng; không gửi đơn tự động. Giá và tồn kho được xác nhận trực tiếp với Nornails.

Bản cập nhật dùng nền trắng và taupe, ảnh manicure thật, chữ Libre Caslon Display và DM Sans. Tài nguyên ảnh và font được phục vụ tại máy; các ảnh sử dụng có nguồn trong `ASSET-SOURCES.md`.

Đã kiểm tra riêng bằng cấu hình iPhone 13: vuốt cảm ứng ngang trong danh mục hoạt động, menu mobile mở/đóng đúng và nút xem tất cả hiển thị đủ 8 sản phẩm. Không xuất hiện cuộn ngang toàn trang.

## Cập nhật màu sắc — 22/10/2026

Đổi nhận diện sang đỏ rượu vang `#651B32`, mận đậm `#391020` và kem ấm `#F4E9DC`. Đã xem lại toàn trang trên desktop 1440 px và mobile 390/320 px: không tràn ngang, không ảnh lỗi, không lỗi JavaScript. Các mảng tối dùng chữ kem sáng và viền focus riêng để dễ đọc, dễ điều hướng. Bố cục và chức năng sản phẩm được giữ nguyên.

## Ngôn ngữ và tìm kiếm — 23/10/2026

Đã kiểm tra trên Chromium ở 1440, 768, 390 và 320 px:

- Chuyển Na Uy → Anh → Na Uy; dịch trang, danh mục, sản phẩm, thông báo, nhãn hỗ trợ tiếp cận, metadata và email hỏi hàng.
- Nhớ lựa chọn sau khi tải lại và khi quay lại URL không có tham số; hỗ trợ `?lang=en` và `?lang=nb`.
- Vẫn đổi ngôn ngữ được khi localStorage bị trình duyệt chặn.
- Tìm qua ô đầu trang bằng Enter/nút Search; tìm trực tiếp và dùng phím mũi tên để chọn kết quả trong cửa sổ tìm kiếm.
- Tìm cả “nail drill” / “negledrill”, “acetone” / “aceton”, thương hiệu và nhiều từ khóa như “buffer orange”, “novicide 500”.
- Tình huống không có kết quả, dữ liệu giống HTML được coi là văn bản và không được thực thi.
- Giữ bộ lọc và trạng thái xem toàn bộ sản phẩm khi đổi ngôn ngữ.
- Không ảnh lỗi, lỗi JavaScript hoặc tràn ngang trong cả hai ngôn ngữ.

Đã xem ảnh chụp desktop và mobile của bản tiếng Anh. Trên mobile, ô nhập dùng font 16 px khi gõ để tránh trình duyệt phóng to khi focus. Chưa gửi email hay xuất bản trong lần cập nhật này.


## Admin & Stripe preparation — 2026-11-07

- Added root `admin.html`, product/price editor, bilingual product fields, search/category/visibility filters, safe image URLs, local draft persistence and JSON export/import. No prices or customer data were invented.
- Added a separate Cloudflare Worker/D1 API: server-side admin login, expiring/revocable sessions, persistent login throttling, CORS allowlist, validated product CRUD with optimistic versions, settings, Stripe Checkout and signed/idempotent webhook handling.
- All 9 API integration tests pass using real SQLite and Web Crypto, with Stripe HTTP responses mocked. Checked authorization, expiry/logout, rate limits, CORS, stale edits, validation, integer prices, server-controlled amounts, disabled checkout, signatures/replay/mode/amount checks and payment status.
- Applied both migrations to local D1 successfully. Tested actual Worker runtime login, price updates and hidden products from the admin through to the storefront in NO/EN. The local fixture was restored after testing.
- Browser checks at 1440, 1024, 768, 390 and 320px: no horizontal overflow or JavaScript errors. Inspected desktop/mobile screenshots. Checked draft CRUD/reload, empty/invalid price, filtering, export, unsaved-change confirmation and the original bilingual storefront search.
- iPhone 13 touch emulation: edited price, saved draft payment settings with checkout disabled, checked 16px inputs, mocked checkout request, escaped product HTML, pending-to-paid return polling and blocked-storage errors.
- Wrangler production bundle dry-run passes. No cloud resources were created, no deployment or Git push was performed, and no real Stripe payment was attempted.
- Checkout is off in the shipped configuration. Customer/cloud credentials and actual Stripe end-to-end testing are required before activation. Setup instructions: `backend/README.md`.


## Vietnamese admin & customer Stripe setup links — 2026-11-08

- Added VI/EN admin UI (Vietnamese default), persisted language selection, translated labels, notifications, errors and confirmation dialogs. Switching language preserves unsaved product values. Product NO/EN content stays independent.
- Added private expiring setup invitations, copy/revoke controls, and `stripe-setup.html` for the store owner. OAuth state is one-use and bound to a first-party HttpOnly/Secure/SameSite=Lax cookie; the authenticated holder can continue Stripe-hosted onboarding. Account capabilities/requirements determine the displayed result; return URLs never imply success.
- All 17 API tests pass: existing checkout/CRUD regression plus invitation authentication/expiry/replacement/revocation, OAuth cancellation/replay/mode/scope checks, account verification, authenticated onboarding, direct merchant charges and cross-account/deauthorization webhook guards.
- Browser integration used the actual Worker handler, Web Crypto and SQLite through Playwright routes, with Stripe HTTP/authorization/onboarding explicitly mocked. Redirect responses were shimmed into document navigations so browser routing could intercept every provider step. No real Stripe account or payment was used.
- Verified VI/EN at 1440/1024/768/390/320px for every admin section; checked saved fields, validation text, new invitation generation, OAuth cookie/state, needs-information/pending/success/failure/revoked states, administrator status refresh, replacement links opened in the same tab, and no automatic checkout enablement.
- iPhone 13 touch check passed for product editing, 16px inputs, Vietnamese notifications and language persistence. No JS errors or horizontal overflow in the completed browser run. Inspected desktop/mobile screenshots; added a complete Vietnamese serif fallback and collapsed advanced credentials.
- Migration `0003_connect.sql` applies successfully to local D1; Worker bundle dry-run passes. A deployed API, platform Stripe Connect client ID/key, correct OAuth redirect URI and connected-account webhook secret are still required before real customer links can be created. Root API configuration remains empty and real checkout remains off.


## Buyer delivery selection & QR order payment — 2026-11-08

- Replaced the admin's global delivery selection with supported-method checkboxes and a confirmed shipping fee. Buyer selection is required in the product order form, and the estimate updates with quantity/method. Unknown shipping fees are not silently made free.
- Orders now open a dedicated NO/EN payment page with immutable item/quantity/price/subtotal/shipping/total details, delivery choice, print action, a Stripe Checkout QR and a same-device payment button. QR generation is local (qrcode-generator 2.0.4, MIT).
- Verified the on-screen QR by decoding its PNG with ZXing and comparing the full result to the server-created Stripe URL. Checked dense URLs with fragments and the 320/390px layout.
- The order and QR badges share one server state. A valid paid webhook automatically replaces the payable QR with a paid confirmation; asynchronous processing, failure, expiry and network interruptions hide payment actions. Cancellation resumes the same order via its opaque reference; URL flags cannot confirm payment.
- All 23 API integration tests pass, including buyer choice and authoritative shipping, disabled/missing options/fees, public invoice privacy, saved admin shipping addresses, processing-to-paid/failure, expiry, unknown sessions and legacy session reuse.
- Browser integration with the actual Worker/SQLite handler and mocked Stripe passed: required buyer choice, totals, invoice navigation, QR decoding, automatic paid updates, reload/idempotence, cancellation, outage/recovery, async processing/failure, expired/forged status, admin options, and iPhone 13 touch controls. No JS errors or horizontal overflow at 1440/1024/768/390/320px in NO/EN.
- Local D1 migration 0004 and Worker dry-run build pass. Payment/Stripe services remain unconfigured in the public static site; no real payment was attempted and no demo invoice/price/QR is exposed as a genuine order.

- Payment print-media check: test orders retain a visible test-mode label in printed order summaries, including when the QR panel is omitted from print.

## Supabase connection — 2026-11-08

- Connected the existing project `clyshqnbxapwipacbaxd`; added eleven `nornails_*` tables and deployed only the new `nornails-api` Edge Function. Eight confirmed products, no prices, no orders, no admin credentials. Checkout remains off.
- Existing `notes` content checksum (three rows) and all five pre-existing public table column/RLS fingerprints matched before/after. Existing `notebyme-api` was not redeployed. No Supabase Auth configuration or identities were changed.
- All 26 automated tests pass. All 42 store statements also ran against hosted PostgreSQL inside a rolled-back transaction, including optimistic edit conflicts and successful/failed atomic batches. No verification route remains deployed.
- Live API: catalogue 200 with eight products and `storage: supabase`; private state 401; deferred admin login and disabled checkout 503. Publishable-key Data API reads of products/orders/admin credentials are denied. Server credentials never enter static files.
- Security/performance advisors checked: new tables intentionally have RLS with no public policies or grants (server-only). Pre-existing Auth and `backend_sessions` advisories were left unchanged.
- Browser QA with real Supabase: desktop/390/320px storefront and admin, VI/EN status, no login gate/account assignment, local price draft retained after reload, no unauthenticated write requests or change to the public price, no JS errors or document overflow. Small-screen admin navigation stacks icons above labels.
- Admin account setup is deferred per the owner: public editing remains explicitly labelled as drafts. Product publication and real Stripe testing require their separate configuration later.
