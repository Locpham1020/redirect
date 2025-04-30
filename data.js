/**
 * DỮ LIỆU SẢN PHẨM - PHIÊN BẢN SIÊU ĐƠN GIẢN
 * Version: 5.0.0
 * Cập nhật lần cuối: 30/04/2025
 */

const PRODUCT_DATA = {
  // Container SP01
  "sp01": {
    "money": "150,000",
    "link_shopee": "https://shopee.vn/product-1",
    "link_tiktok": "https://www.tiktok.com/@username/video/123456"
  },
  
  // Container SP02
  "sp02": {
    "money": "199,000",
    "link_shopee": "https://shopee.vn/product-2",
    "link_tiktok": "https://www.tiktok.com/@username/video/234567"
  },
  
  // Container SP03
  "sp03": {
    "money": "299,000",
    "link_shopee": "https://shopee.vn/product-3",
    "link_tiktok": "https://www.tiktok.com/@username/video/345678"
  },
  
  // Container SP04
  "sp04": {
    "money": "450,000",
    "link_shopee": "https://shopee.vn/product-4",
    "link_tiktok": "https://www.tiktok.com/@username/video/456789"
  },
  
  // Container SP05
  "sp05": {
    "money": "350,000",
    "link_shopee": "https://shopee.vn/product-5",
    "link_tiktok": "https://www.tiktok.com/@username/video/567890"
  },
  
  // Container SP06
  "sp06": {
    "money": "250,000",
    "link_shopee": "https://shopee.vn/product-6",
    "link_tiktok": "https://www.tiktok.com/@username/video/678901"
  }
};

/**
 * Không cần chỉnh sửa phần code bên dưới
 */
function initDorikSync() {
  console.log("🔄 Đã tải dữ liệu sản phẩm (v5.0.0)");
  window.PRODUCT_DATA = PRODUCT_DATA;
  
  // Tự động kích hoạt cập nhật nếu đã load main.js
  if (window.DorikSync && typeof window.DorikSync.updateAll === 'function') {
    console.log("🔄 Kích hoạt cập nhật tự động...");
    window.DorikSync.updateAll();
  }
}

// Kích hoạt ngay khi script này được tải
initDorikSync();
