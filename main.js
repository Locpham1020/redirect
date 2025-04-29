/**
 * Product Display & Tracking Application
 * Version: 3.0.0
 * Handles data loading, UI updates, and click tracking
 */

(function() {
  // Ngăn chạy nhiều lần
  if (window.ProductApp) {
    console.log("ProductApp đã được khởi tạo");
    return;
  }

  // Ứng dụng chính
  const ProductApp = {
    // Cấu hình
    config: {
      // *** THAY ĐỔI dataUrl THÀNH URL WEB APP CỦA BẠN ***
      dataUrl: 'https://script.google.com/macros/s/AKfycbyCaZ6lfRXdHSSD-VJLU6CF_ZiD1Qi--flHAYVIM8SFDf8dJaujBulFPUgQY1ePlT9ZVw/exec',
      loggerUrl: 'https://script.google.com/macros/s/AKfycbwiTGvwlmbqReewb4XXs5wJ3txCFrHk4HKaqNVBCF81U-Oly1H_Hey-tIFUq1uT535kLA/exec',
      cacheKey: 'product_data_v3',
      cacheExpiration: 1 * 60 * 1000, // 1 phút 
      pollInterval: 10 * 1000, // Kiểm tra dữ liệu mới mỗi 10 giây
      version: '3.0.0',
      debug: true
    },

    // Quản lý dữ liệu
    dataManager: {
      data: null,

      // Tải dữ liệu từ cache
      loadFromCache: function() {
        try {
          const cached = localStorage.getItem(ProductApp.config.cacheKey);
          if (cached) {
            const parsedData = JSON.parse(cached);
            const cacheTime = parsedData._metadata?.updated_at || 0;
            
            // Kiểm tra hết hạn
            if (Date.now() - new Date(cacheTime).getTime() < ProductApp.config.cacheExpiration) {
              this.data = parsedData;
              return true;
            }
          }
        } catch (e) {
          console.error('Lỗi khi đọc cache:', e);
        }
        return false;
      },

      // Lưu dữ liệu vào cache
      saveToCache: function(data) {
        try {
          if (!data._metadata) {
            data._metadata = {
              updated_at: new Date().toISOString()
            };
          }
          localStorage.setItem(ProductApp.config.cacheKey, JSON.stringify(data));
        } catch (e) {
          console.error('Lỗi khi lưu cache:', e);
        }
      },

      // Tải dữ liệu từ Google Sheet Web App
      loadFromServer: function() {
        // Thêm timestamp và random để tránh cache hoàn toàn
        const cacheBuster = Date.now() + Math.random().toString(36).substring(2, 15);
        return fetch(ProductApp.config.dataUrl + '?t=' + cacheBuster)
          .then(response => response.json())
          .then(data => {
            this.data = data;
            this.saveToCache(data);
            return data;
          })
          .catch(error => {
            console.error('Lỗi khi tải dữ liệu:', error);
            throw error;
          });
      },

      // Lấy dữ liệu cho container
      getDataForContainer: function(containerId) {
        return this.data && this.data[containerId];
      }
    },

    // Quản lý UI
    uiManager: {
      // Cập nhật giá trị money
      updateMoneyValue: function(container, value) {
        if (!value) return false;
        
        // Mở rộng tìm kiếm nhiều loại phần tử
        const titleElements = container.querySelectorAll('.icon-text-title, [class*="title"], .title, .price, .amount, span, div, p');
        for (let i = 0; i < titleElements.length; i++) {
          const element = titleElements[i];
          const text = element.textContent || '';
          if (text.includes('Title') || text.includes('$') || 
              text.includes('VND') || text.includes('Giá') || 
              text.includes('Price')) {
            element.textContent = value + ' VND';
            if (ProductApp.config.debug) console.log('Đã cập nhật giá:', value, 'cho container:', container.id);
            return true;
          }
        }
        
        // Nếu không tìm thấy, thử tìm phần tử đầu tiên
        const firstSpan = container.querySelector('span');
        if (firstSpan) {
          firstSpan.textContent = value + ' VND';
          if (ProductApp.config.debug) console.log('Fallback: Đã cập nhật giá cho phần tử đầu tiên');
          return true;
        }
        
        if (ProductApp.config.debug) console.warn('Không tìm thấy phần tử để cập nhật giá cho container:', container.id);
        return false;
      },

      // Xác định platform từ hình ảnh
      detectPlatformFromElement: function(element) {
        // Kiểm tra innerHTML, src, alt, class, hoặc bất kỳ thuộc tính nào
        const html = (element.outerHTML || '').toLowerCase();
        const src = (element.src || '').toLowerCase();
        const alt = (element.alt || '').toLowerCase();
        const className = (element.className || '').toLowerCase();
        
        if (html.includes('shopee') || src.includes('shopee') || 
            alt.includes('shopee') || className.includes('shopee')) {
          return 'shopee';
        }
        
        if (html.includes('tiktok') || src.includes('tiktok') || 
            alt.includes('tiktok') || className.includes('tiktok')) {
          return 'tiktok';
        }
        
        // Kiểm tra các phần tử con
        const img = element.querySelector('img');
        if (img) {
          const imgSrc = (img.src || '').toLowerCase();
          const imgAlt = (img.alt || '').toLowerCase();
          
          if (imgSrc.includes('shopee') || imgAlt.includes('shopee')) return 'shopee';
          if (imgSrc.includes('tiktok') || imgAlt.includes('tiktok')) return 'tiktok';
        }
        
        return 'unknown';
      },

      // Cập nhật link cho các platform - Cải tiến
      updatePlatformLinks: function(container, data) {
        let updated = false;
        
        // Bước 1: Tìm tất cả các phần tử có thể chứa shopee/tiktok
        const allElements = container.querySelectorAll('*');
        
        // Bước 2: Xác định platform cho từng phần tử
        for (let i = 0; i < allElements.length; i++) {
          const element = allElements[i];
          const platform = this.detectPlatformFromElement(element);
          
          if (platform === 'unknown') continue;
          
          // Lấy URL tương ứng
          const url = platform === 'shopee' ? data.link_shopee : data.link_tiktok;
          if (!url) continue;
          
          // Bước 3: Gắn link
          if (element.tagName === 'A') {
            // Nếu đã là link, chỉ cập nhật href
            element.href = url;
            element.setAttribute('target', '_blank'); // Mở trong tab mới
            element.onclick = function(e) {
              ProductApp.trackingManager.logClick(container.id, platform);
            };
            updated = true;
          } 
          else if (element.parentNode && element.parentNode.tagName !== 'A') {
            // Nếu không phải link và không nằm trong link, tạo wrapper
            const wrapper = document.createElement('a');
            wrapper.href = url;
            wrapper.setAttribute('target', '_blank'); // Mở trong tab mới
            wrapper.style.cssText = 'cursor:pointer;text-decoration:none;color:inherit;';
            wrapper.onclick = function(e) {
              e.stopPropagation(); // Ngăn event bubbling
              ProductApp.trackingManager.logClick(container.id, platform);
            };
            
            try {
              // Thay thế phần tử bằng wrapper và thêm phần tử vào wrapper
              element.parentNode.replaceChild(wrapper, element);
              wrapper.appendChild(element);
              updated = true;
            } catch (err) {
              console.error('Lỗi khi tạo link cho', platform, err);
            }
          }
          
          // Thêm debug
          if (ProductApp.config.debug && updated) {
            console.log(`Đã cập nhật link ${platform} (${url}) cho container ${container.id}`);
          }
        }
        
        // FORCE thêm target="_blank" cho tất cả links
        setTimeout(() => {
          container.querySelectorAll('a[href*="shopee"], a[href*="tiktok"]').forEach(link => {
            link.setAttribute('target', '_blank');
            if (ProductApp.config.debug) console.log('FORCE set target=_blank cho:', link.href);
          });
        }, 100);
        
        return updated;
      },

      // Cập nhật một container
      updateContainer: function(containerId) {
        const container = document.getElementById(containerId);
        if (!container) {
          if (ProductApp.config.debug) console.log(`Không tìm thấy container: ${containerId}`);
          return false;
        }
        
        const data = ProductApp.dataManager.getDataForContainer(containerId);
        if (!data) {
          if (ProductApp.config.debug) console.log(`Không có dữ liệu cho container: ${containerId}`);
          return false;
        }
        
        let updated = false;
        
        // Cập nhật giá
        if (this.updateMoneyValue(container, data.money)) {
          updated = true;
        }
        
        // Cập nhật link
        if (this.updatePlatformLinks(container, data)) {
          updated = true;
        }
        
        return updated;
      },

      // Cập nhật tất cả container
      updateAllContainers: function() {
        if (!ProductApp.dataManager.data) {
          console.warn('Không có dữ liệu để cập nhật containers');
          return;
        }
        
        // Lấy danh sách containers từ dữ liệu
        const containerIds = Object.keys(ProductApp.dataManager.data).filter(key => !key.startsWith('_'));
        
        let updatedCount = 0;
        containerIds.forEach(containerId => {
          if (this.updateContainer(containerId)) {
            updatedCount++;
          }
        });
        
        console.log(`Đã cập nhật ${updatedCount}/${containerIds.length} containers`);
        
        // GLOBAL HACK: Force target="_blank" cho toàn bộ trang
        document.querySelectorAll('a[href*="shopee"], a[href*="tiktok"]').forEach(link => {
          link.setAttribute('target', '_blank');
        });
      }
    },

    // Quản lý tracking
    trackingManager: {
      // Ghi log click
      logClick: function(productId, platform) {
        try {
          const tracker = new Image();
          tracker.src = `${ProductApp.config.loggerUrl}?product_id=${encodeURIComponent(productId)}&platform=${encodeURIComponent(platform)}&user_agent=${encodeURIComponent(navigator.userAgent)}&t=${Date.now()}`;
          console.log(`Đã ghi log click cho ${productId} (${platform})`);
        } catch(error) {
          console.error('Lỗi khi gửi log:', error);
        }
      }
    },

    // Lazy loading các container
    lazyLoadManager: {
      observer: null,
      
      // Khởi tạo intersection observer
      init: function() {
        if ('IntersectionObserver' in window) {
          this.observer = new IntersectionObserver(this.onIntersection, {
            rootMargin: '200px', // Tăng khoảng cách để tải sớm hơn
            threshold: 0.01
          });
          
          // Tìm và theo dõi tất cả containers
          this.observeContainers();
        } else {
          // Fallback cho trình duyệt cũ
          ProductApp.uiManager.updateAllContainers();
        }
      },
      
      // Xử lý khi container xuất hiện trong viewport
      onIntersection: function(entries, observer) {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const containerId = entry.target.id;
            ProductApp.uiManager.updateContainer(containerId);
            observer.unobserve(entry.target);
            if (ProductApp.config.debug) console.log(`Lazy load: Đã tải container ${containerId}`);
          }
        });
      },
      
      // Theo dõi tất cả container
      observeContainers: function() {
        if (!this.observer) return;
        
        // Tìm theo nhiều pattern container ID
        const containerSelectors = ['[id^="sp"]', '.product-container', '[data-product]'];
        containerSelectors.forEach(selector => {
          document.querySelectorAll(selector).forEach(container => {
            this.observer.observe(container);
            if (ProductApp.config.debug) console.log(`Đang theo dõi container: ${container.id || 'không có ID'}`);
          });
        });
      }
    },

    // Khởi tạo ứng dụng
    init: function() {
      console.log('Khởi tạo ProductApp v' + this.config.version);
      
      // Tải dữ liệu từ cache trước
      const cacheLoaded = this.dataManager.loadFromCache();
      if (cacheLoaded) {
        console.log('Đã tải dữ liệu từ cache');
        this.uiManager.updateAllContainers();
      }
      
      // Khởi tạo lazy loading
      this.lazyLoadManager.init();
      
      // Tải dữ liệu mới từ server
      setTimeout(() => {
        this.dataManager.loadFromServer()
          .then(() => {
            console.log('Đã tải dữ liệu mới từ server');
            this.uiManager.updateAllContainers();
          })
          .catch(error => {
            console.error('Không thể tải dữ liệu mới:', error);
          });
      }, cacheLoaded ? 500 : 0); // Nếu có cache, đợi 500ms sau mới tải
      
      // Thêm interval polling để cập nhật dữ liệu định kỳ
      setInterval(() => {
        this.dataManager.loadFromServer()
          .then(() => {
            console.log('Đã tải dữ liệu mới từ server (polling)');
            this.uiManager.updateAllContainers();
          })
          .catch(error => {
            console.error('Lỗi polling:', error);
          });
      }, this.config.pollInterval);
      
      // Force kiểm tra links mỗi 10 giây
      setInterval(() => {
        document.querySelectorAll('a[href*="shopee"], a[href*="tiktok"]').forEach(link => {
          if (link.target !== '_blank') {
            link.setAttribute('target', '_blank');
            if (this.config.debug) console.log('Đã phát hiện và sửa link không có target=_blank:', link.href);
          }
        });
      }, 10000);
    }
  };

  // Gán vào window để tránh chạy lại
  window.ProductApp = ProductApp;
  
  // Khởi tạo ngay
  ProductApp.init();
})();
