/**
 * Dorik Sync - Phiên bản siêu đơn giản
 * Version: 5.0.0
 * Tác giả: Ứng dụng Đồng bộ Dorik
 */

(function() {
  // Tránh khởi tạo nhiều lần
  if (window.DorikSync) {
    console.log("⚠️ DorikSync đã được khởi tạo trước đó");
    return;
  }
  
  // Định nghĩa đối tượng chính
  const DorikSync = {
    version: "5.0.0",
    debug: true,
    
    // Khởi tạo DorikSync
    init: function() {
      // Thêm CSS cần thiết
      this.addCSS();
      
      // Chờ DOM sẵn sàng
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => this.onReady());
      } else {
        this.onReady();
      }
      
      console.log("✅ DorikSync v5.0.0 đã khởi tạo");
      return this;
    },
    
    // Hàm chạy khi DOM đã sẵn sàng
    onReady: function() {
      // Kiểm tra dữ liệu
      if (!window.PRODUCT_DATA) {
        console.error("❌ Không tìm thấy PRODUCT_DATA. Vui lòng đảm bảo data.js được tải trước main.js");
        return;
      }
      
      // Cập nhật tất cả containers
      this.updateAll();
      
      // Theo dõi thay đổi DOM
      this.observeDomChanges();
      
      // Thiết lập kiểm tra định kỳ
      setInterval(() => this.fixAllLinks(), 5000);
      
      // Fix thêm khi trang đã load hoàn toàn
      window.addEventListener('load', () => {
        setTimeout(() => this.updateAll(), 1000);
        setTimeout(() => this.fixAllLinks(), 2000);
      });
    },
    
    // Thêm CSS cần thiết
    addCSS: function() {
      const style = document.createElement('style');
      style.textContent = `
        img[src*="shopee"], img[alt*="shopee"],
        img[src*="tiktok"], img[alt*="tiktok"] {
          cursor: pointer !important;
        }
      `;
      document.head.appendChild(style);
    },
    
    // Cập nhật giá tiền cho container
    updatePrice: function(container, price) {
      if (!price) return false;
      
      try {
        // Định dạng giá
        let formattedPrice = price;
        if (!price.toString().includes('VND')) {
          formattedPrice = price + ' VND';
        }
        
        // Tìm phần tử hiển thị giá
        const priceElements = container.querySelectorAll('.price, .amount, .icon-text-title, [class*="price"], [class*="title"]');
        
        for (let i = 0; i < priceElements.length; i++) {
          const element = priceElements[i];
          const text = element.textContent || '';
          
          // Kiểm tra nếu đây là phần tử hiển thị giá
          if (text.includes('VND') || text.includes('Giá') || 
              text.includes('Price') || /\d{3,}/.test(text)) {
            element.textContent = formattedPrice;
            if (this.debug) console.log(`💰 Đã cập nhật giá: ${formattedPrice} cho ${container.id}`);
            return true;
          }
        }
        
        // Nếu không tìm thấy, thử tìm bất kỳ phần tử span nào
        const anySpan = container.querySelector('span');
        if (anySpan) {
          anySpan.textContent = formattedPrice;
          if (this.debug) console.log(`💰 Đã cập nhật giá (fallback): ${formattedPrice} cho ${container.id}`);
          return true;
        }
        
        return false;
      } catch (e) {
        console.error(`❌ Lỗi khi cập nhật giá cho ${container.id}:`, e);
        return false;
      }
    },
    
    // Làm cho hình ảnh Shopee/TikTok có thể click
    makeImageClickable: function(img, url, platform) {
      try {
        // Nếu đã xử lý rồi thì bỏ qua
        if (img.hasAttribute('data-clickable')) return;
        
        // Kiểm tra xem đã nằm trong link chưa
        let isInsideLink = false;
        let parent = img.parentNode;
        
        while (parent && parent !== document.body) {
          if (parent.tagName === 'A') {
            // Cập nhật link
            parent.href = url;
            parent.setAttribute('target', '_blank');
            parent.setAttribute('rel', 'noopener');
            img.setAttribute('data-clickable', 'true');
            isInsideLink = true;
            break;
          }
          parent = parent.parentNode;
        }
        
        // Nếu chưa nằm trong link, thêm click handler trực tiếp
        if (!isInsideLink) {
          img.style.cursor = 'pointer';
          img.setAttribute('data-clickable', 'true');
          img.setAttribute('data-url', url);
          img.setAttribute('data-platform', platform);
          
          img.addEventListener('click', function() {
            window.open(url, '_blank');
          });
          
          if (this.debug) console.log(`🔗 Đã thêm click handler cho hình ${platform}`);
        }
      } catch (e) {
        console.error(`❌ Lỗi khi xử lý hình ${platform}:`, e);
      }
    },
    
    // Cập nhật links Shopee và TikTok
    updateLinks: function(container, data) {
      try {
        if (!data) return false;
        
        // Xử lý links Shopee
        if (data.link_shopee) {
          // Tìm tất cả hình ảnh Shopee
          const shopeeImages = container.querySelectorAll('img[src*="shopee"], img[alt*="shopee"]');
          shopeeImages.forEach(img => {
            this.makeImageClickable(img, data.link_shopee, 'shopee');
          });
          
          // Cập nhật cả links có sẵn
          container.querySelectorAll('a[href*="shopee"]').forEach(link => {
            link.href = data.link_shopee;
            link.setAttribute('target', '_blank');
            link.setAttribute('rel', 'noopener');
          });
        }
        
        // Xử lý links TikTok
        if (data.link_tiktok) {
          // Tìm tất cả hình ảnh TikTok
          const tiktokImages = container.querySelectorAll('img[src*="tiktok"], img[alt*="tiktok"]');
          tiktokImages.forEach(img => {
            this.makeImageClickable(img, data.link_tiktok, 'tiktok');
          });
          
          // Cập nhật cả links có sẵn
          container.querySelectorAll('a[href*="tiktok"]').forEach(link => {
            link.href = data.link_tiktok;
            link.setAttribute('target', '_blank');
            link.setAttribute('rel', 'noopener');
          });
        }
        
        return true;
      } catch (e) {
        console.error(`❌ Lỗi khi cập nhật links cho ${container.id}:`, e);
        return false;
      }
    },
    
    // Cập nhật một container
    updateContainer: function(containerId) {
      try {
        // Tìm container
        const container = document.getElementById(containerId);
        if (!container) {
          if (this.debug) console.log(`⚠️ Không tìm thấy container: ${containerId}`);
          return false;
        }
        
        // Lấy dữ liệu
        const data = window.PRODUCT_DATA[containerId];
        if (!data) {
          if (this.debug) console.log(`⚠️ Không có dữ liệu cho container: ${containerId}`);
          return false;
        }
        
        let updated = false;
        
        // Cập nhật giá
        if (this.updatePrice(container, data.money)) {
          updated = true;
        }
        
        // Cập nhật links
        if (this.updateLinks(container, data)) {
          updated = true;
        }
        
        // Đánh dấu container đã cập nhật
        if (updated) {
          container.setAttribute('data-updated', 'true');
          if (this.debug) console.log(`✅ Container ${containerId} đã được cập nhật thành công`);
        }
        
        return updated;
      } catch (e) {
        console.error(`❌ Lỗi khi cập nhật container ${containerId}:`, e);
        return false;
      }
    },
    
    // Cập nhật tất cả các containers
    updateAll: function() {
      try {
        // Kiểm tra dữ liệu
        if (!window.PRODUCT_DATA) {
          console.error("❌ Không tìm thấy PRODUCT_DATA");
          return 0;
        }
        
        // Lấy danh sách container IDs
        const containerIds = Object.keys(window.PRODUCT_DATA);
        let updatedCount = 0;
        
        // Cập nhật từng container
        containerIds.forEach(id => {
          if (this.updateContainer(id)) {
            updatedCount++;
          }
        });
        
        // Fix thêm cho tất cả links
        this.fixAllLinks();
        
        console.log(`✅ Đã cập nhật ${updatedCount}/${containerIds.length} containers`);
        return updatedCount;
      } catch (e) {
        console.error("❌ Lỗi khi cập nhật containers:", e);
        return 0;
      }
    },
    
    // Đảm bảo tất cả links mở trong tab mới
    fixAllLinks: function() {
      try {
        // Fix links Shopee và TikTok
        document.querySelectorAll('a[href*="shopee"], a[href*="tiktok"]').forEach(link => {
          link.setAttribute('target', '_blank');
          link.setAttribute('rel', 'noopener');
        });
        
        // Thêm xử lý cho hình ảnh chưa được xử lý
        document.querySelectorAll('img[src*="shopee"]:not([data-clickable]), img[src*="tiktok"]:not([data-clickable])').forEach(img => {
          // Tìm container ID
          let containerId = null;
          let container = img;
          
          while (container && container !== document.body) {
            if (container.id && window.PRODUCT_DATA && window.PRODUCT_DATA[container.id]) {
              containerId = container.id;
              break;
            }
            container = container.parentElement;
          }
          
          if (containerId) {
            const data = window.PRODUCT_DATA[containerId];
            const platform = img.src.includes('shopee') || img.alt.includes('shopee') ? 'shopee' : 'tiktok';
            const url = platform === 'shopee' ? data.link_shopee : data.link_tiktok;
            
            if (url) {
              this.makeImageClickable(img, url, platform);
            }
          }
        });
      } catch (e) {
        console.error("❌ Lỗi khi fix links:", e);
      }
    },
    
    // Theo dõi thay đổi DOM để cập nhật các container mới
    observeDomChanges: function() {
      if (!window.MutationObserver) return;
      
      const observer = new MutationObserver(mutations => {
        let needsUpdate = false;
        
        mutations.forEach(mutation => {
          if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
            for (let i = 0; i < mutation.addedNodes.length; i++) {
              const node = mutation.addedNodes[i];
              // Chỉ quan tâm các phần tử HTML
              if (node.nodeType === 1) {
                // Kiểm tra nếu là container hoặc chứa container
                if ((node.id && window.PRODUCT_DATA && window.PRODUCT_DATA[node.id]) ||
                   (node.querySelector && node.querySelector('[id^="sp"]'))) {
                  needsUpdate = true;
                  break;
                }
              }
            }
          }
        });
        
        if (needsUpdate) {
          console.log("🔄 Phát hiện thay đổi DOM, cập nhật containers...");
          setTimeout(() => this.updateAll(), 500);
        }
      });
      
      // Theo dõi toàn bộ body
      observer.observe(document.body, {
        childList: true,
        subtree: true
      });
      
      console.log("👁️ Đang theo dõi thay đổi DOM");
    }
  };
  
  // Khởi tạo và xuất DorikSync
  window.DorikSync = DorikSync.init();
  
  // Nếu đã có dữ liệu, cập nhật ngay
  if (window.PRODUCT_DATA) {
    console.log("🔄 Đã tìm thấy dữ liệu sản phẩm, cập nhật ngay...");
    setTimeout(() => DorikSync.updateAll(), 100);
  }
})();
