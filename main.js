/**
 * Product Display & Tracking Application
 * Version: 1.0.0
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
      dataUrl: 'https://raw.githubusercontent.com/Locpham1020/redirect/main/data.json',
      loggerUrl: 'https://script.google.com/macros/s/AKfycbwiTGvwlmbqReewb4XXs5wJ3txCFrHk4HKaqNVBCF81U-Oly1H_Hey-tIFUq1uT535kLA/exec',
      cacheKey: 'product_data_v1',
      cacheExpiration: 5 * 60 * 1000, // 5 phút
      version: '1.0.0'
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
            const cacheTime = parsedData._timestamp || 0;
            
            // Kiểm tra hết hạn
            if (Date.now() - cacheTime < ProductApp.config.cacheExpiration) {
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
          data._timestamp = Date.now();
          localStorage.setItem(ProductApp.config.cacheKey, JSON.stringify(data));
        } catch (e) {
          console.error('Lỗi khi lưu cache:', e);
        }
      },

      // Tải dữ liệu từ GitHub
      loadFromServer: function() {
        return fetch(ProductApp.config.dataUrl + '?t=' + Date.now())
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
        if (!value) return;
        
        // Tìm phần tử hiển thị giá
        const titleElements = container.querySelectorAll('.icon-text-title, [class*="title"]');
        for (let i = 0; i < titleElements.length; i++) {
          const element = titleElements[i];
          if (element.textContent.includes('Title') || element.textContent.includes('$')) {
            element.textContent = value + ' VND';
            return true;
          }
        }
        return false;
      },

      // Xác định platform từ hình ảnh
      detectPlatformFromImage: function(element) {
        // Kiểm tra nội dung HTML
        const innerHTML = element.innerHTML.toLowerCase();
        if (innerHTML.includes('shopee')) return 'shopee';
        if (innerHTML.includes('tiktok')) return 'tiktok';
        
        // Kiểm tra hình ảnh
        const img = element.querySelector('img');
        if (img) {
          const src = (img.src || '').toLowerCase();
          const alt = (img.alt || '').toLowerCase();
          
          if (src.includes('shopee') || alt.includes('shopee')) return 'shopee';
          if (src.includes('tiktok') || alt.includes('tiktok')) return 'tiktok';
        }
        
        return 'unknown';
      },

      // Cập nhật link cho các platform
      updatePlatformLinks: function(container, data) {
        // Tìm tất cả các phần tử có thể là link
        const elements = container.querySelectorAll('a, img, div');
        const updatedPlatforms = {shopee: false, tiktok: false};
        
        for (let i = 0; i < elements.length; i++) {
          const element = elements[i];
          const platform = this.detectPlatformFromImage(element);
          
          if (platform === 'unknown' || updatedPlatforms[platform]) continue;
          
          const url = platform === 'shopee' ? data.link_shopee : data.link_tiktok;
          if (!url) continue;
          
          if (element.tagName === 'A') {
            element.href = url;
            element.setAttribute('data-platform', platform);
            element.onclick = function(e) {
              ProductApp.trackingManager.logClick(container.id, platform);
            };
            updatedPlatforms[platform] = true;
          } else if (element.parentNode && element.parentNode.tagName !== 'A') {
            const wrapper = document.createElement('a');
            wrapper.href = url;
            wrapper.style.cssText = 'cursor:pointer;text-decoration:none;color:inherit;';
            wrapper.setAttribute('data-platform', platform);
            wrapper.onclick = function(e) {
              ProductApp.trackingManager.logClick(container.id, platform);
            };
            element.parentNode.replaceChild(wrapper, element);
            wrapper.appendChild(element);
            updatedPlatforms[platform] = true;
          }
        }
        
        return updatedPlatforms.shopee || updatedPlatforms.tiktok;
      },

      // Cập nhật một container
      updateContainer: function(containerId) {
        const container = document.getElementById(containerId);
        if (!container) return false;
        
        const data = ProductApp.dataManager.getDataForContainer(containerId);
        if (!data) return false;
        
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
        if (!ProductApp.dataManager.data) return;
        
        // Lấy danh sách containers từ dữ liệu
        const containerIds = Object.keys(ProductApp.dataManager.data).filter(key => !key.startsWith('_'));
        
        let updatedCount = 0;
        containerIds.forEach(containerId => {
          if (this.updateContainer(containerId)) {
            updatedCount++;
          }
        });
        
        console.log(`Đã cập nhật ${updatedCount}/${containerIds.length} containers`);
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
            rootMargin: '100px',
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
          }
        });
      },
      
      // Theo dõi tất cả container
      observeContainers: function() {
        if (!this.observer) return;
        
        // Tìm tất cả container có ID bắt đầu bằng "sp"
        for (let i = 1; i <= 99; i++) {
          const containerId = `sp${i.toString().padStart(2, '0')}`;
          const container = document.getElementById(containerId);
          if (container) {
            this.observer.observe(container);
          }
        }
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
      }, cacheLoaded ? 2000 : 0); // Nếu có cache, đợi 2s sau mới tải
    }
  };

  // Gán vào window để tránh chạy lại
  window.ProductApp = ProductApp;
  
  // Khởi tạo ngay
  ProductApp.init();
})();
