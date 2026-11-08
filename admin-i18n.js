'use strict';
// UI copy only. Product names, entered values and API credentials are never translated.
(() => {
  const vi = {
    'Nornails — Store admin': 'Nornails — Quản trị cửa hàng', 'Nornails — Stripe setup': 'Nornails — Thiết lập Stripe',
    'Admin language': 'Ngôn ngữ quản trị', 'Language': 'Ngôn ngữ', 'Setup link': 'Link thiết lập', 'Complete your details': 'Hoàn tất thông tin', 'See the result': 'Xem kết quả',
    'Replace the existing setup link?': 'Thay link thiết lập hiện tại?', 'The previous invitation will stop working.': 'Lời mời trước đó sẽ hết hiệu lực.', 'Create new link': 'Tạo link mới',
    'Skip to content': 'Đến nội dung chính', 'STORE ADMIN': 'QUẢN TRỊ CỬA HÀNG', 'YOUR WORKSPACE': 'KHÔNG GIAN QUẢN TRỊ',
    'Administration': 'Quản trị', 'Products': 'Sản phẩm', 'Payments': 'Thanh toán', 'Orders': 'Đơn hàng', 'Store setup': 'Cài đặt',
    'SANDVIKA, NORWAY': 'SANDVIKA, NA UY', 'Visit storefront': 'Xem website', 'Professional nail supply.': 'Vật tư nail chuyên nghiệp.',
    'Local draft': 'Bản nháp', 'Connect store': 'Kết nối cửa hàng', 'Sign out': 'Đăng xuất', 'Prepare your store.': 'Chuẩn bị cửa hàng.',
    'Changes are saved as drafts in this browser. Connect the store API to publish products and prices to the website.': 'Thay đổi được lưu nháp trên trình duyệt này. Kết nối API để cập nhật sản phẩm và giá lên website.',
    'Setup guide': 'Hướng dẫn cài đặt', 'THE COLLECTION': 'DANH MỤC SẢN PHẨM', 'Curate your collection. Keep every detail in place.': 'Quản lý danh mục, thông tin và giá sản phẩm tại đây.',
    'Export catalogue': 'Xuất danh mục', 'Add product': 'Thêm sản phẩm', 'Total products': 'Tổng sản phẩm', 'In your catalogue': 'Trong danh mục',
    'Visible products': 'Đang hiển thị', 'Shown in the collection': 'Hiển thị trên cửa hàng', 'Prices to add': 'Chưa có giá', 'No price is assumed': 'Giá chờ chủ cửa hàng bổ sung',
    'Online payments': 'Thanh toán online', 'Not connected': 'Chưa kết nối', 'Configure Stripe': 'Thiết lập Stripe', 'Product visibility': 'Trạng thái hiển thị',
    'All products': 'Tất cả', 'Visible': 'Hiển thị', 'Hidden': 'Đã ẩn', 'Search products…': 'Tìm sản phẩm…', 'Search products': 'Tìm sản phẩm',
    'Filter by category': 'Lọc danh mục', 'All categories': 'Mọi danh mục', 'Negler': 'Sản phẩm nail', 'Manikyrutstyr': 'Dụng cụ manicure',
    'Pedikyr': 'Pedicure', 'Drill bits': 'Đầu mài', 'Elektrisk utstyr': 'Thiết bị điện', 'Sterilisering': 'Vệ sinh & khử khuẩn',
    'Product': 'Sản phẩm', 'Category': 'Danh mục', 'Price · NOK': 'Giá · NOK', 'Visibility': 'Hiển thị', 'Actions': 'Thao tác',
    'No products found': 'Không tìm thấy sản phẩm', 'Try a different search or add a product to the collection.': 'Thử từ khóa khác hoặc thêm sản phẩm vào danh mục.',
    'Clear filters': 'Xóa bộ lọc', 'Drafts stay in this browser': 'Bản nháp chỉ lưu trên trình duyệt này', 'CHECKOUT, CONSIDERED': 'THIẾT LẬP THANH TOÁN',
    'Get everything ready. Go live when your business is ready.': 'Tạo link để chủ cửa hàng tự kết nối Stripe và theo dõi kết quả.',
    'Stripe not connected': 'Chưa kết nối Stripe', 'Awaiting credentials': 'Chờ cấu hình', 'A seamless way to pay.': 'Thanh toán thuận tiện.',
    'Hosted Stripe Checkout. Card details are handled by Stripe.': 'Stripe Checkout xử lý thanh toán và thông tin thẻ trực tiếp.',
    'Secret API key': 'Khóa API bí mật', 'Not configured': 'Chưa cấu hình', 'Webhook signing secret': 'Khóa xác minh webhook', 'Currency': 'Tiền tệ',
    'NOK · Norwegian krone': 'NOK · Krone Na Uy', 'Check Stripe connection': 'Kiểm tra Stripe', 'Server credentials': 'Cấu hình kỹ thuật',
    'Keys are added to the API’s encrypted server secrets. This page never asks you to paste a secret key into the browser.': 'Khóa bí mật được lưu ở server. Trang này không yêu cầu dán khóa Stripe vào trình duyệt.',
    'Secret key': 'Khóa bí mật', 'Webhook secret': 'Khóa webhook', 'Webhook endpoint': 'Địa chỉ webhook', 'Open Stripe test keys ↗': 'Mở khóa thử nghiệm Stripe ↗',
    'Checkout settings': 'Cài đặt nhận thanh toán', 'Keep checkout off until your prices and business details are confirmed.': 'Chỉ bật sau khi xác nhận giá và thông tin kinh doanh.',
    'Enable online checkout': 'Bật thanh toán online', 'Requires a connected API, Stripe keys and confirmed settings.': 'Cần API, Stripe đã kết nối và thông tin được xác nhận.',
    'Order delivery': 'Cách giao hàng', 'Pickup in Sandvika': 'Nhận hàng tại Sandvika', 'Ship within Norway': 'Giao hàng trong Na Uy', 'Shipping fee · NOK': 'Phí giao hàng · NOK',
    'Use the confirmed shipping fee. Zero means free shipping.': 'Nhập phí giao hàng đã xác nhận. Số 0 là miễn phí vận chuyển.', 'Tax treatment': 'Cách tính thuế',
    'Tax included in prices': 'Giá đã bao gồm thuế', 'Stripe Tax (inclusive)': 'Stripe Tax (giá gồm thuế)',
    'Use confirmed tax-inclusive prices. Stripe Tax requires activation and tax registrations in Stripe.': 'Dùng giá đã xác nhận bao gồm thuế. Stripe Tax cần được kích hoạt và đăng ký thuế trong Stripe.',
    'Terms of sale URL': 'Link điều khoản bán hàng', 'I have confirmed product prices, taxes, delivery and the terms of sale with the store owner.': 'Tôi đã xác nhận giá, thuế, giao hàng và điều khoản bán hàng với chủ cửa hàng.',
    'Save checkout settings': 'Lưu cài đặt', 'FROM CHECKOUT TO YOUR DESK': 'QUẢN LÝ ĐƠN HÀNG', 'Payments are confirmed by Stripe’s signed webhook.': 'Chỉ xác nhận đã thanh toán khi nhận được webhook hợp lệ từ Stripe.',
    'Refresh': 'Làm mới', 'A PLACE FOR EVERYTHING': 'THIẾT LẬP CỬA HÀNG', 'Your storefront stays on GitHub Pages. Your API handles the rest.': 'Website chạy trên GitHub Pages; API quản lý dữ liệu và thanh toán.',
    'From draft to connected store.': 'Từ bản nháp đến cửa hàng.', 'Prepare the collection': 'Chuẩn bị sản phẩm',
    'Add products, descriptions and confirmed prices here. Export a catalogue backup before switching browsers.': 'Thêm sản phẩm, mô tả và giá đã xác nhận. Xuất bản sao trước khi đổi trình duyệt.',
    'Set up the store API': 'Cài đặt API cửa hàng', 'Deploy the included Cloudflare Worker and D1 database. Configure an admin email and a password hash in server secrets.': 'Triển khai Cloudflare Worker và D1 có sẵn. Cấu hình email quản trị và mật khẩu đã mã hóa ở server.',
    'Connect the storefront': 'Kết nối website', 'Add the API URL to': 'Thêm địa chỉ API vào', 'and set the storefront URL and allowed origins on the server.': 'và cấu hình địa chỉ website cùng danh sách nguồn được phép ở server.',
    'Test Stripe, then enable checkout': 'Thử Stripe rồi bật thanh toán', 'Start with test credentials, register the webhook and test a payment. Switch to live keys after the owner confirms all business details.': 'Bắt đầu với chế độ thử nghiệm, cấu hình webhook và thử thanh toán. Chuyển sang chế độ thật khi chủ cửa hàng xác nhận đầy đủ thông tin.',
    'Full developer instructions:': 'Hướng dẫn kỹ thuật đầy đủ:', 'in the repository.': 'trong mã nguồn.', 'Store details': 'Thông tin cửa hàng', 'Brand': 'Thương hiệu',
    'Website': 'Website', 'Email': 'Email', 'Phone': 'Điện thoại', 'Location': 'Địa chỉ', 'WHILE YOU PREPARE': 'TRONG KHI CHUẨN BỊ', 'No credentials yet?': 'Chưa có tài khoản?',
    'You can edit and export a local catalogue draft now. Draft changes do not update the public website or enable real payments.': 'Bạn có thể sửa và xuất danh mục nháp. Bản nháp không thay đổi website công khai hay bật thanh toán thật.',
    'Import catalogue draft': 'Nhập danh mục nháp', 'PROFESSIONAL NAIL SUPPLY': 'VẬT TƯ NAIL CHUYÊN NGHIỆP', 'Local preparation workspace': 'Không gian chuẩn bị bản nháp',
    'YOUR COLLECTION': 'SẢN PHẨM CỦA BẠN', 'Edit product': 'Sửa sản phẩm', 'Close product editor': 'Đóng form sản phẩm', 'Product preview': 'Xem trước sản phẩm', 'Product image': 'Ảnh sản phẩm',
    'assets/images/w1.webp or https://…': 'assets/images/w1.webp hoặc https://…', 'Use an existing asset path or a public HTTPS image URL.': 'Dùng đường dẫn ảnh có sẵn hoặc link ảnh HTTPS công khai.',
    'Norwegian · NO': 'Tiếng Na Uy · NO', 'Product name': 'Tên sản phẩm', 'Size / unit': 'Dung tích / đơn vị', 'Short description': 'Mô tả ngắn', 'Description': 'Mô tả',
    'English · EN': 'Tiếng Anh · EN', 'Empty translations use the Norwegian content.': 'Để trống sẽ dùng nội dung tiếng Na Uy.', 'Not set': 'Chưa đặt giá',
    'Leave empty to show “Contact for price”.': 'Để trống để hiển thị “Liên hệ hỏi giá”.', 'Visible in store': 'Hiển thị trên cửa hàng', 'Hidden from store': 'Ẩn khỏi cửa hàng',
    'Show the manufacturer’s safety reminder.': 'Hiển thị nhắc nhở an toàn của nhà sản xuất.', 'Delete product': 'Xóa sản phẩm', 'Cancel': 'Hủy', 'Save product': 'Lưu sản phẩm',
    'YOUR STORE, CONNECTED': 'KẾT NỐI CỬA HÀNG', 'Sign in to your store': 'Đăng nhập quản trị', 'Close sign in': 'Đóng đăng nhập',
    'Use the credentials configured on your store API. There is no default admin account.': 'Dùng tài khoản đã cấu hình trên API. Không có tài khoản quản trị mặc định.',
    'Store API URL': 'Địa chỉ API cửa hàng', 'Admin email': 'Email quản trị', 'Password': 'Mật khẩu', 'Sign in': 'Đăng nhập',
    'No server configured yet? Close this window to keep preparing your local draft.': 'Chưa cấu hình server? Đóng cửa sổ để tiếp tục làm bản nháp.', 'Delete this product?': 'Xóa sản phẩm này?',
    'JavaScript is required to use the product editor.': 'Cần bật JavaScript để dùng trang quản trị sản phẩm.',
    '＋ Add price': '＋ Thêm giá', 'Edit ↗': 'Sửa ↗', 'Store connected': 'Đã kết nối', 'Store connected.': 'Đã kết nối cửa hàng.',
    'Saved products and prices update the public catalogue. Checkout remains controlled by your payment settings.': 'Sản phẩm và giá đã lưu được cập nhật lên website. Thanh toán tuân theo cài đặt của bạn.',
    'Refresh catalogue →': 'Làm mới danh mục →', 'Changes publish to the connected store': 'Thay đổi được lưu lên cửa hàng đã kết nối', 'Connected store workspace': 'Quản trị cửa hàng đã kết nối',
    'Configured on server': 'Đã cấu hình ở server', 'Connect the store API first': 'Kết nối API cửa hàng trước', 'NO ORDERS YET': 'CHƯA CÓ ĐƠN HÀNG',
    'READY WHEN YOU ARE': 'SẴN SÀNG KHI BẠN CẦN', 'Your orders will arrive here.': 'Đơn hàng sẽ hiển thị tại đây.',
    'Completed checkouts appear after Stripe sends a verified payment event. No sample orders are shown.': 'Đơn hàng xuất hiện sau khi Stripe gửi sự kiện thanh toán hợp lệ. Không có đơn hàng mẫu.',
    'Connect your store API and configure Stripe to receive orders. No sample sales or customer data is used.': 'Kết nối API và Stripe để nhận đơn. Không dùng doanh số hay thông tin khách hàng giả.',
    'Showing the 100 most recent checkout attempts. Only “Paid” means payment was confirmed. Test orders are labelled.': 'Hiển thị 100 lượt thanh toán gần nhất. Chỉ “Đã thanh toán” mới được xác nhận nhận tiền. Đơn thử nghiệm có nhãn riêng.',
    'Checkout in progress': 'Đang thanh toán', 'TEST': 'THỬ NGHIỆM', 'LIVE': 'THỰC TẾ', 'Paid': 'Đã thanh toán', 'Pending': 'Đang chờ', 'Failed': 'Thất bại', 'Expired': 'Hết hạn',
    'Checkout off': 'Đang tắt', 'Test checkout': 'Thanh toán thử', 'Live checkout': 'Thanh toán thật', 'Test mode': 'Chế độ thử nghiệm', 'Live mode': 'Chế độ thật',
    'Session expired': 'Phiên đã hết hạn', 'Sign in again': 'Đăng nhập lại', 'Save & publish →': 'Lưu lên cửa hàng →', 'Save draft →': 'Lưu bản nháp →',
    'Discard unsaved changes?': 'Bỏ thay đổi chưa lưu?', 'Your last saved product will be kept.': 'Sản phẩm đã lưu gần nhất vẫn được giữ lại.', 'Discard changes': 'Bỏ thay đổi',
    'Product saved to the store.': 'Đã lưu sản phẩm lên cửa hàng.', 'Draft saved in this browser. The public store is unchanged.': 'Đã lưu bản nháp trên trình duyệt. Website công khai chưa thay đổi.',
    'Product deleted from the store.': 'Đã xóa sản phẩm khỏi cửa hàng.', 'Product deleted from the browser draft.': 'Đã xóa sản phẩm khỏi bản nháp.',
    'Connect the store API to load orders and published products.': 'Kết nối API để tải đơn hàng và sản phẩm trên cửa hàng.', 'Store data refreshed.': 'Đã làm mới dữ liệu cửa hàng.',
    'Signed in. The server catalogue is loaded; your local draft is still saved separately.': 'Đăng nhập thành công. Đã tải danh mục từ server; bản nháp vẫn được lưu riêng.',
    'Checkout settings saved on the server.': 'Đã lưu cài đặt thanh toán lên server.', 'Draft settings saved in this browser. Checkout remains off.': 'Đã lưu cài đặt nháp trên trình duyệt. Thanh toán vẫn tắt.',
    'Catalogue exported. Keep this file as a backup.': 'Đã xuất danh mục. Hãy giữ file này để sao lưu.', 'Replace your local draft?': 'Thay thế bản nháp hiện tại?', 'Import draft': 'Nhập bản nháp',
    'Catalogue imported as a local draft.': 'Đã nhập danh mục thành bản nháp.',
    'Browser storage is unavailable or full. Export a backup, or enable storage before saving drafts.': 'Trình duyệt không cho lưu hoặc đã đầy. Hãy xuất bản sao hoặc bật lưu trữ trước khi lưu nháp.',
    'Browser storage is unavailable. Settings were not saved.': 'Trình duyệt không cho lưu trữ. Cài đặt chưa được lưu.',
    'Could not reach the store API. Check the URL, connection and allowed origins.': 'Không kết nối được API. Kiểm tra địa chỉ, mạng và cấu hình nguồn được phép.',
    'The server did not return a valid API response. Check the API URL.': 'Phản hồi server không hợp lệ. Hãy kiểm tra địa chỉ API.',
    'Choose a Nornails catalogue with at most 500 products.': 'Chọn danh mục Nornails có tối đa 500 sản phẩm.', 'The file contains duplicate product IDs.': 'File có mã sản phẩm bị trùng.',
    'Choose a catalogue file smaller than 1 MB.': 'Chọn file danh mục nhỏ hơn 1 MB.', 'Use an HTTPS API origin, without a path. Localhost HTTP is allowed for development.': 'Dùng địa chỉ gốc API HTTPS, không có đường dẫn. Chỉ localhost được dùng HTTP khi thử nghiệm.',
    'Use a positive NOK price with at most two decimal places.': 'Nhập giá NOK dương, tối đa hai chữ số thập phân.', 'Price must be between NOK 0.01 and 999,999.99.': 'Giá phải từ 0,01 đến 999.999,99 NOK.',
    'Images must use HTTPS or an assets/images/ path.': 'Ảnh phải dùng HTTPS hoặc đường dẫn assets/images/.', 'Enter an image URL.': 'Hãy nhập địa chỉ ảnh.',
    'Check the product text fields.': 'Kiểm tra các ô nội dung sản phẩm.', 'Confirm prices, tax and delivery, and add the terms URL before enabling checkout.': 'Xác nhận giá, thuế, giao hàng và thêm link điều khoản trước khi bật thanh toán.',
    'Terms URL must use HTTPS.': 'Link điều khoản phải dùng HTTPS.', 'Please sign in again.': 'Vui lòng đăng nhập lại.', 'Your session has expired. Please sign in again.': 'Phiên làm việc đã hết hạn. Vui lòng đăng nhập lại.',
    'Incorrect email or password.': 'Email hoặc mật khẩu chưa đúng.', 'Too many attempts. Please wait 15 minutes.': 'Bạn đã thử quá nhiều lần. Hãy đợi 15 phút.',
    'Admin credentials have not been configured on the server.': 'Server chưa được cấu hình tài khoản quản trị.', 'The product changed in another session. Refresh before editing.': 'Sản phẩm đã được sửa ở phiên khác. Hãy làm mới trước khi sửa tiếp.',
    'Configure Stripe and complete the merchant setup before enabling checkout.': 'Cấu hình Stripe và hoàn tất thiết lập tài khoản của chủ cửa hàng trước khi bật thanh toán.',
    'The customer has not connected a Stripe account yet.': 'Khách chưa kết nối tài khoản Stripe.', 'Request could not be completed. Please try again.': 'Chưa thực hiện được yêu cầu. Vui lòng thử lại.',
    'Stripe could not be reached. Please try again.': 'Không kết nối được Stripe. Vui lòng thử lại.', 'Stripe rejected the request. Check server credentials and Stripe settings.': 'Stripe từ chối yêu cầu. Hãy kiểm tra cấu hình và khóa ở server.',
    'CUSTOMER SETUP': 'KHÁCH TỰ THIẾT LẬP', 'One link. Your customer takes it from here.': 'Một link để khách tự thiết lập.',
    'Create a private setup link. The store owner signs in to Stripe, completes the required steps, and sees the verified result.': 'Tạo link riêng để chủ cửa hàng đăng nhập Stripe, hoàn tất các bước và xem kết quả được xác minh.',
    'Link expiry': 'Thời hạn link', '24 hours': '24 giờ', '3 days': '3 ngày', '7 days': '7 ngày', 'Create setup link': 'Tạo link thiết lập',
    'Copy link': 'Sao chép link', 'Revoke setup links': 'Thu hồi các link', 'Refresh setup status': 'Kiểm tra kết quả', 'Setup status': 'Trạng thái thiết lập',
    'Not started': 'Chưa bắt đầu', 'Successful': 'Thành công', 'Awaiting Stripe review': 'Stripe đang xác minh', 'More information needed': 'Cần bổ sung thông tin',
    'Setup failed': 'Thiết lập thất bại', 'Cancelled': 'Đã hủy', 'Disconnected': 'Đã ngắt kết nối', 'Creating link…': 'Đang tạo link…',
    'Connect the store API and configure Stripe Connect before creating a real customer link.': 'Kết nối API và cấu hình Stripe Connect trước khi tạo link thật cho khách.',
    'Share the setup link with the store owner. A newly created link replaces previous setup invitations.': 'Gửi link thiết lập cho chủ cửa hàng. Link mới sẽ thay thế các lời mời trước đó.',
    'Copied setup link.': 'Đã sao chép link thiết lập.', 'Could not copy automatically. Select and copy the link below.': 'Không sao chép tự động được. Hãy chọn và sao chép link bên dưới.',
    'Setup links revoked. The Stripe account itself is unchanged.': 'Đã thu hồi các link thiết lập. Tài khoản Stripe vẫn được giữ nguyên.',
    'Revoke all setup links?': 'Thu hồi tất cả link thiết lập?', 'Existing setup invitations and their return sessions will stop working. This does not disconnect the Stripe merchant.': 'Các lời mời và phiên thiết lập hiện có sẽ hết hiệu lực. Thao tác này không ngắt tài khoản Stripe của cửa hàng.',
    'Revoke links': 'Thu hồi link', 'Configure Stripe Connect and the HTTPS storefront URL on the server first.': 'Cấu hình Stripe Connect và địa chỉ website HTTPS trên server trước.',
    'Stripe Connect is not configured on this API yet.': 'API này chưa được cấu hình Stripe Connect.',
    'PAYMENT SETUP': 'THIẾT LẬP THANH TOÁN', 'Set up payments for Nornails.': 'Thiết lập thanh toán cho Nornails.',
    'Sign in securely with Stripe, complete your business details there, then return here to check the result.': 'Đăng nhập an toàn qua Stripe, hoàn tất thông tin doanh nghiệp tại đó rồi quay lại đây xem kết quả.',
    'Continue with Stripe': 'Tiếp tục với Stripe', 'Continue setup on Stripe': 'Bổ sung thông tin trên Stripe', 'Check status again': 'Kiểm tra lại',
    'Your Stripe setup is complete.': 'Thiết lập Stripe thành công.', 'Stripe has confirmed that the connected account is ready to accept payments and receive payouts.': 'Stripe đã xác nhận tài khoản kết nối sẵn sàng nhận thanh toán và chuyển tiền về ngân hàng.',
    'Stripe is reviewing your information.': 'Stripe đang xác minh thông tin.', 'Your connection is saved. Stripe has not finished verifying all payment or payout requirements yet.': 'Kết nối đã được lưu. Stripe chưa xác minh xong các yêu cầu nhận thanh toán hoặc chuyển tiền.',
    'A few details are still needed.': 'Cần bổ sung một số thông tin.', 'Continue on Stripe to complete the remaining business, identity or bank details.': 'Tiếp tục trên Stripe để bổ sung thông tin doanh nghiệp, xác minh danh tính hoặc ngân hàng.',
    'Setup was not completed.': 'Chưa thiết lập thành công.', 'The connection could not be confirmed. Try signing in with Stripe again, or contact the website administrator.': 'Chưa xác nhận được kết nối. Hãy đăng nhập Stripe lại hoặc liên hệ người quản trị website.',
    'You cancelled the Stripe connection.': 'Bạn đã hủy kết nối Stripe.', 'No successful connection was confirmed. You can try again when ready.': 'Chưa có kết nối thành công được xác nhận. Bạn có thể thử lại khi sẵn sàng.',
    'This Stripe account was disconnected.': 'Tài khoản Stripe đã ngắt kết nối.', 'Sign in with Stripe again to reconnect the same store account.': 'Đăng nhập Stripe lại để kết nối lại đúng tài khoản của cửa hàng.',
    'This setup link is invalid or expired.': 'Link thiết lập không hợp lệ hoặc đã hết hạn.', 'Ask the website administrator to create a new setup link.': 'Nhờ người quản trị website tạo link thiết lập mới.',
    'Payment setup is not configured yet. Please contact the website administrator.': 'Hệ thống thiết lập thanh toán chưa được cấu hình. Vui lòng liên hệ người quản trị website.',
    'Unable to check the setup status.': 'Chưa kiểm tra được trạng thái.', 'Check your connection and try again. A return from Stripe does not by itself mean setup succeeded.': 'Kiểm tra kết nối mạng rồi thử lại. Việc quay về từ Stripe chưa có nghĩa là thiết lập thành công.',
    'Your onboarding link expired. Continue to create a fresh Stripe link.': 'Phiên thiết lập trên Stripe đã hết hạn. Bấm tiếp tục để mở phiên mới.',
    'Checking Stripe…': 'Đang kiểm tra Stripe…', 'Your business, identity and bank details stay with Stripe. No Stripe password or secret key is requested on this page.': 'Thông tin doanh nghiệp, giấy tờ và ngân hàng được nhập trực tiếp trên Stripe. Trang này không yêu cầu mật khẩu Stripe hay khóa bí mật.',
    'Test setup · no real payments are enabled by this flow.': 'Thiết lập thử nghiệm · luồng này không bật thanh toán thật.', 'Back to Nornails': 'Về Nornails',
    'Setup completed. Checkout still follows the store administrator’s payment settings.': 'Đã hoàn tất thiết lập. Thanh toán trên website vẫn tuân theo cài đặt của người quản trị.'
  };
  const patterns = [
    [/^(\d+) of (\d+) products$/, (a,b) => `${a} / ${b} sản phẩm`],
    [/^Edit price for (.+)$/, name => `Sửa giá ${name}`], [/^Edit (.+)$/, name => `Sửa ${name}`],
    [/^(.+) will be removed (from the connected store|from this browser draft)\. Export a catalogue backup if you need to keep a copy\.$/, (name, place) => `${name} sẽ bị xóa ${place === 'from the connected store' ? 'khỏi cửa hàng' : 'khỏi bản nháp'}. Hãy xuất danh mục nếu cần giữ bản sao.`],
    [/^(\d+) products will replace the catalogue draft in this browser\. The public store is unchanged\.$/, count => `${count} sản phẩm sẽ thay thế bản nháp trên trình duyệt. Website công khai không thay đổi.`],
    [/^Stripe (test|live) credentials accepted\. Charges (enabled|not enabled) on the account\. Webhook delivery still needs an end-to-end test\.$/, (mode, state) => `Khóa Stripe ${mode === 'test' ? 'thử nghiệm' : 'thật'} hợp lệ. Tài khoản ${state === 'enabled' ? 'đã' : 'chưa'} được bật nhận tiền. Vẫn cần kiểm thử webhook thực tế.`],
    [/^Link expires: (.+)$/, date => `Link hết hạn: ${date}`],
    [/^(.+) The local session has been cleared\.$/, error => `${translate(error)} Phiên trên trình duyệt đã được xóa.`]
  ];
  let language = 'vi';
  try { language = localStorage.getItem('nornails.admin.language') === 'en' ? 'en' : 'vi'; } catch { /* Optional preference. */ }
  const originals = new WeakMap();
  const originalAttributes = new WeakMap();
  function translate(value) {
    if (language !== 'vi') return value;
    if (vi[value]) return vi[value];
    for (const [pattern, replacement] of patterns) { const match = value.match(pattern); if (match) return replacement(...match.slice(1)); }
    // Buttons often append a separate directional glyph to a known label.
    const arrow = value.match(/^(.*?) ([↗→↓↑])$/);
    return arrow && vi[arrow[1]] ? vi[arrow[1]] + ' ' + arrow[2] : value;
  }
  const observer = new MutationObserver(apply);
  function apply() {
    observer.disconnect();
    document.documentElement.lang = language;
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) {
      const node = walker.currentNode;
      if (node.parentElement.closest('script,style,code,textarea,[data-admin-raw]')) continue;
      if (!originals.has(node)) originals.set(node, node.nodeValue);
      const original = originals.get(node);
      const trimmed = original.trim();
      if (trimmed) node.nodeValue = original.replace(trimmed, translate(trimmed));
    }
    document.querySelectorAll('[placeholder],[aria-label],[title],[alt]').forEach(element => {
      if (element.closest('[data-admin-raw]')) return;
      let saved = originalAttributes.get(element);
      if (!saved) { saved = {}; originalAttributes.set(element, saved); }
      for (const attribute of ['placeholder','aria-label','title','alt']) if (element.hasAttribute(attribute)) {
        const current = element.getAttribute(attribute);
        if (!(attribute in saved) || current !== saved[attribute].last) saved[attribute] = { original: current, last: current };
        const translated = translate(saved[attribute].original);
        element.setAttribute(attribute, translated);
        saved[attribute].last = translated;
      }
    });
    document.querySelectorAll('[data-admin-language]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.adminLanguage === language)));
    const title = document.title;
    for (const english of ['Nornails — Store admin','Nornails — Stripe setup']) if ([english,vi[english]].includes(title)) document.title = language === 'vi' ? vi[english] : english;
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
  }
  function setLanguage(next) {
    if (!['vi','en'].includes(next)) return;
    language = next;
    try { localStorage.setItem('nornails.admin.language', language); } catch { /* Optional preference. */ }
    apply();
  }
  document.addEventListener('click', event => { const button = event.target.closest('[data-admin-language]'); if (button) setLanguage(button.dataset.adminLanguage); });
  globalThis.nornailsAdminI18n = { translate, apply, setLanguage, get language() { return language; } };
  document.addEventListener('DOMContentLoaded', apply);
})();
