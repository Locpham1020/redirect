/**
 * Product Display & Tracking Application
 * Version: 4.0 - Enhanced Reliability
 * Last updated: 2025-04-30
 */

(function() {
  // Ngăn chạy nhiều lần
  if (window.ProductApp) {
    console.log("⚠️ ProductApp đã được khởi tạo");
    return;
  }

  // Ứng dụng chính
  const ProductApp = {
    // Cấu hình mặc định
    config: {
      dataUrl: 'https://raw.githubusercontent.com/Locpham1020/redirect/main/data.json',
      fallbackDataUrl: 'https://cdn.jsdelivr.net/gh/Locpham1020/redirect@main/data.json',
      loggerUrl: 'https://script.google.com/macros/s/AKfycbwiTGvwlmbqReewb4XXs5wJ3txCFrHk4HKaqNVBCF81U-Oly1H_Hey-tIFUq1uT535kLA/exec',
      cacheKey: 'product_data_v4',
      cacheExpiration: 5 * 60 * 1000, // 5 phút
      pollInterval: 30 * 1000, // 30 giây
      retryDelay: 3000, // 3 giây
      maxRetries: 3,
      version: '4.0',
      debug: true,
      forceRefresh: false,
      showNotifications: false,
      createPriceElementIfMissing: true
    },

    // Thống kê hiệu suất
    stats: {
      startTime: Date.now(),
      apiCalls: 0,
      apiErrors: 0,
      containersUpdated: 0,
      cacheHits: 0
    },

    // Biến theo dõi trạng thái
    state: {
      isInitialized: false,
      lastUpdate: null,
      loadAttemptsCount: 0,
      isLoading: false,
      dataSource: 'none'
    },

    // Quản lý dữ liệu
    dataManager: {
      data: null,

      // Tải dữ liệu từ cache
      loadFromCache: function() {
        if (ProductApp.config.forceRefresh) {
          if (ProductApp.config.debug) console.log('🔄 Bỏ qua cache do forceRefresh=true');
          return false;
        }
        
        try {
          const cached = localStorage.getItem(ProductApp.config.cacheKey);
          if (cached) {
            const parsedData = JSON.parse(cached);
            const cacheTime = parsedData._metadata?.updated_at || 0;
            
            // Kiểm tra hết hạn
            if (Date.now() - new Date(cacheTime).getTime() < ProductApp.config.cacheExpiration) {
              this.data = parsedData;
              ProductApp.stats.cacheHits++;
              ProductApp.state.dataSource = 'cache';
              ProductApp.state.lastUpdate = new Date(cacheTime);
              return true;
            } else {
              if (ProductApp.config.debug) console.log('🕒 Cache đã hết hạn');
            }
          }
        } catch (e) {
          console.error('❌ Lỗi khi đọc cache:', e);
        }
        return false;
      },

      // Lưu dữ liệu vào cache
      saveToCache: function(data) {
        try {
          if (!data._metadata) {
            data._metadata = {};
          }
          
          data._metadata.updated_at = new Date().toISOString();
          data._metadata.cache_version = ProductApp.config.version;
          
          localStorage.setItem(ProductApp.config.cacheKey, JSON.stringify(data));
          
          if (ProductApp.config.debug) console.log('💾 Đã lưu dữ liệu vào cache');
        } catch (e) {
          console.error('❌ Lỗi khi lưu cache:', e);
        }
      },

      // Tải dữ liệu từ server với retry
      loadFromServer: function(retryCount = 0) {
        // Cập nhật trạng thái
        ProductApp.state.isLoading = true;
        ProductApp.state.loadAttemptsCount++;
        ProductApp.stats.apiCalls++;
        
        // Thêm timestamp để tránh cache
        const cacheBuster = Date.now() + Math.random().toString(36).substring(2, 15);
        const url = ProductApp.config.dataUrl + '?t=' + cacheBuster;
        
        if (ProductApp.config.debug) console.log(`🔄 Đang tải dữ liệu từ ${url} (lần thứ ${retryCount + 1}/${ProductApp.config.maxRetries + 1})`);
        
        // Thiết lập timeout để tránh treo
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);
        
        return fetch(url, {
          signal: controller.signal,
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
          }
        })
          .then(response => {
            clearTimeout(timeoutId);
            if (!response.ok) {
              throw new Error(`HTTP error ${response.status}`);
            }
            return response.json();
          })
          .then(data => {
            if (ProductApp.config.debug) console.log('✅ Đã tải dữ liệu thành công:', Object.keys(data).filter(k => !k.startsWith('_')).length, 'sản phẩm');
            
            this.data = data;
            this.saveToCache(data);
            
            ProductApp.state.isLoading = false;
            ProductApp.state.dataSource = 'primary';
            ProductApp.state.lastUpdate = new Date();
            
            return data;
          })
          .catch(error => {
            clearTimeout(timeoutId);
            console.error(`❌ Lỗi khi tải dữ liệu (${retryCount + 1}/${ProductApp.config.maxRetries + 1}):`, error);
            
            ProductApp.stats.apiErrors++;
            
            // Thử lại nếu chưa đạt số lần tối đa
            if (retryCount < ProductApp.config.maxRetries) {
              console.log(`🔄 Thử lại sau ${ProductApp.config.retryDelay/1000}s...`);
              
              return new Promise(resolve => {
                setTimeout(() => {
                  resolve(this.loadFromServer(retryCount + 1));
                }, ProductApp.config.retryDelay);
              });
            }
            
            // Nếu đã thử hết số lần, dùng fallback URL
            if (ProductApp.config.fallbackDataUrl) {
              console.log('⚠️ Sử dụng URL dự phòng...');
              
              return fetch(ProductApp.config.fallbackDataUrl + '?t=' + cacheBuster)
                .then(response => response.json())
                .then(data => {
                  console.log('✅ Đã tải dữ liệu từ URL dự phòng');
                  
                  this.data = data;
                  this.saveToCache(data);
                  
                  ProductApp.state.isLoading = false;
                  ProductApp.state.dataSource = 'fallback';
                  ProductApp.state.lastUpdate = new Date();
                  
                  return data;
                })
                .catch(fallbackError => {
                  console.error('❌ Lỗi khi tải từ URL dự phòng:', fallbackError);
                  ProductApp.state.isLoading = false;
                  throw fallbackError;
                });
            }
            
            ProductApp.state.isLoading = false;
            throw error;
          });
      },

      // Lấy dữ liệu cho container
      getDataForContainer: function(containerId) {
        return this.data && this.data[containerId];
      },
      
      // Làm mới dữ liệu (xóa cache và tải lại)
      refreshData: function() {
        console.log('🔄 Bắt đầu làm mới dữ liệu...');
        
        // Xóa cache
        try {
          localStorage.removeItem(ProductApp.config.cacheKey);
        } catch (e) {}
        
        // Cài đặt cờ làm mới
        ProductApp.config.forceRefresh = true;
        
        // Tải lại dữ liệu
        return this.loadFromServer()
          .then(data => {
            ProductApp.config.forceRefresh = false;
            ProductApp.uiManager.updateAllContainers();
            
            if (ProductApp.config.showNotifications) {
              ProductApp.notificationManager.showSuccess('Đã cập nhật dữ liệu sản phẩm');
            }
            
            return data;
          })
          .catch(error => {
            ProductApp.config.forceRefresh = false;
            
            if (ProductApp.config.showNotifications) {
              ProductApp.notificationManager.showError('Không thể cập nhật dữ liệu');
            }
            
            throw error;
          });
      }
    },

    // Quản lý UI
    uiManager: {
      // Format giá tiền theo định dạng Việt Nam
      formatMoney: function(amount) {
        if (!amount) return '0 VND';
        
        try {
          return parseInt(amount).toLocaleString('vi-VN') + ' VND';
        } catch (e) {
          return amount + ' VND';
        }
      },
      
      // Cập nhật giá trị money
      updateMoneyValue: function(container, value) {
        if (!value) return false;
        
        // Định dạng giá
        const formattedPrice = this.formatMoney(value);
        
        // Mở rộng tìm kiếm nhiều loại phần tử
        const titleElements = container.querySelectorAll(
          '.icon-text-title, [class*="title"], .title, .price, ' + 
          '.amount, [class*="price"], .money, [data-price], ' +
          '.product-price, h1, h2, h3, h4, h5, span, div, p'
        );
        
        // Tìm phần tử theo nội dung
        for (let i = 0; i < titleElements.length; i++) {
          const element = titleElements[i];
          const text = element.textContent || '';
          if (text.includes('Title') || text.includes('$') || 
              text.includes('VND') || text.includes('Giá') || 
              text.includes('Price') || text.includes('đ')) {
            element.textContent = formattedPrice;
            if (ProductApp.config.debug) console.log('💰 Đã cập nhật giá:', formattedPrice, 'cho container:', container.id);
            return true;
          }
        }
        
        // Nếu không tìm thấy, thử tìm phần tử đầu tiên
        const firstTitleElement = container.querySelector('h1, h2, h3, h4, h5, .title, .price');
        if (firstTitleElement) {
          firstTitleElement.textContent = formattedPrice;
          if (ProductApp.config.debug) console.log('💰 Fallback: Đã cập nhật giá cho phần tử tiêu đề đầu tiên');
          return true;
        }
        
        // Thử tìm span đầu tiên
        const firstSpan = container.querySelector('span');
        if (firstSpan) {
          firstSpan.textContent = formattedPrice;
          if (ProductApp.config.debug) console.log('💰 Fallback: Đã cập nhật giá cho span đầu tiên');
          return true;
        }
        
        // Tạo phần tử mới nếu không tìm thấy
        if (ProductApp.config.createPriceElementIfMissing) {
          const priceDiv = document.createElement('div');
          priceDiv.className = 'auto-price-element';
          priceDiv.style.cssText = 'font-weight:bold;color:#e74c3c;margin:5px 0;font-size:16px;';
          priceDiv.textContent = formattedPrice;
          
          // Chèn vào đầu container
          if (container.firstChild) {
            container.insertBefore(priceDiv, container.firstChild);
          } else {
            container.appendChild(priceDiv);
          }
          
          if (ProductApp.config.debug) console.log('💰 Đã tạo phần tử giá mới cho container:', container.id);
          return true;
        }
        
        if (ProductApp.config.debug) console.warn('⚠️ Không tìm thấy phần tử để cập nhật giá cho container:', container.id);
        return false;
      },

      // Xác định platform từ phần tử
      detectPlatformFromElement: function(element) {
        // Kiểm tra nhiều thuộc tính để xác định platform
        
        // Bước 1: Kiểm tra background image
        try {
          const computedStyle = window.getComputedStyle(element);
          const bgImage = (computedStyle.backgroundImage || '').toLowerCase();
          
          if (bgImage.includes('shopee')) return 'shopee';
          if (bgImage.includes('tiktok')) return 'tiktok';
        } catch (e) {}
        
        // Bước 2: Kiểm tra HTML, src, alt, class
        const html = (element.outerHTML || '').toLowerCase();
        const src = ((element.src || '') + '').toLowerCase();
        const alt = ((element.alt || '') + '').toLowerCase();
        const className = ((element.className || '') + '').toLowerCase();
        
        if (html.includes('shopee') || src.includes('shopee') || 
            alt.includes('shopee') || className.includes('shopee')) {
          return 'shopee';
        }
        
        if (html.includes('tiktok') || src.includes('tiktok') || 
            alt.includes('tiktok') || className.includes('tiktok')) {
          return 'tiktok';
        }
        
        // Bước 3: Kiểm tra nội dung text
        const text = ((element.textContent || '') + '').toLowerCase();
        if (text.includes('shopee')) return 'shopee';
        if (text.includes('tiktok')) return 'tiktok';
        
        // Bước 4: Kiểm tra các phần tử con
        const img = element.querySelector('img');
        if (img) {
          const imgSrc = ((img.src || '') + '').toLowerCase();
          const imgAlt = ((img.alt || '') + '').toLowerCase();
          
          if (imgSrc.includes('shopee') || imgAlt.includes('shopee')) return 'shopee';
          if (imgSrc.includes('tiktok') || imgAlt.includes('tiktok')) return 'tiktok';
        }
        
        return 'unknown';
      },

      // Cập nhật link cho các platform
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
              console.error('❌ Lỗi khi tạo link cho', platform, err);
            }
          }
          
          // Thêm debug
          if (updated && ProductApp.config.debug) {
            console.log(`🔗 Đã cập nhật link ${platform} cho container ${container.id}`);
          }
        }
        
        // FORCE thêm target="_blank" cho tất cả links
        setTimeout(() => {
          container.querySelectorAll('a[href*="shopee"], a[href*="tiktok"]').forEach(link => {
            link.setAttribute('target', '_blank');
          });
        }, 100);
        
        return updated;
      },

      // Cập nhật một container
      updateContainer: function(containerId) {
        const container = document.getElementById(containerId);
        if (!container) {
          if (ProductApp.config.debug) console.log(`⚠️ Không tìm thấy container: ${containerId}`);
          return false;
        }
        
        const data = ProductApp.dataManager.getDataForContainer(containerId);
        if (!data) {
          if (ProductApp.config.debug) console.log(`⚠️ Không có dữ liệu cho container: ${containerId}`);
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
        
        if (updated) {
          ProductApp.stats.containersUpdated++;
          // Đánh dấu container đã cập nhật
          container.setAttribute('data-updated', Date.now());
        }
        
        return updated;
      },

      // Cập nhật tất cả container
      updateAllContainers: function() {
        if (!ProductApp.dataManager.data) {
          console.warn('⚠️ Không có dữ liệu để cập nhật containers');
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
        
        console.log(`✅ Đã cập nhật ${updatedCount}/${containerIds.length} containers`);
        
        <script>
// Script backup và target=_blank enforcer
(function() {
  console.log('⚙️ Đang khởi tạo script hỗ trợ...');
  
  // Đợi 3 giây sau đó kiểm tra xem ProductApp đã được khởi tạo chưa
  setTimeout(function() {
    // Force tất cả links shopee/tiktok mở trong tab mới
    function enforceTargetBlank() {
      document.querySelectorAll('a').forEach(link => {
        const href = (link.href || '').toLowerCase();
        if (href.includes('shopee') || href.includes('tiktok')) {
          if (link.target !== '_blank') {
            link.setAttribute('target', '_blank');
            console.log('Footer enforcer: Set target=_blank cho:', href);
          }
        }
      });
      
      // Thêm cả global click handler
      if (!window._clickHandlerAdded) {
        window._clickHandlerAdded = true;
        document.addEventListener('click', function(e) {
          if (e.target.tagName === 'A' || e.target.closest('a')) {
            const link = e.target.tagName === 'A' ? e.target : e.target.closest('a');
            const href = (link.href || '').toLowerCase();
            if (href.includes('shopee') || href.includes('tiktok')) {
              link.setAttribute('target', '_blank');
            }
          }
        }, true);
      }
    }
    
    // Chạy ngay và sau đó mỗi 10 giây
    enforceTargetBlank();
    setInterval(enforceTargetBlank, 10000);
    
    // Tải script backup nếu cần
    if (!window.ProductApp) {
      console.log('⚠️ ProductApp chưa được khởi tạo, chạy backup loader...');
      
      // Tạo script để tải ProductApp
      const script = document.createElement('script');
      // Thêm timestamp để buộc tải phiên bản mới nhất
      const cacheBuster = Date.now() + Math.random().toString(36).substring(2, 15);
      script.src = `https://cdn.jsdelivr.net/gh/Locpham1020/redirect@main/main.js?v=4.0&cb=${cacheBuster}`;
      script.async = true;
      
      // Thêm vào head
      document.head.appendChild(script);
      
      // Phương án dự phòng cuối cùng - tải trực tiếp dữ liệu
      setTimeout(function() {
        if (!window.ProductApp) {
          console.log('⚠️ Vẫn không thể tải ProductApp, tải dữ liệu trực tiếp...');
          
          // Tải dữ liệu
          fetch('https://raw.githubusercontent.com/Locpham1020/redirect/main/data.json?t=' + cacheBuster)
            .then(response => response.json())
            .then(data => {
              console.log('✅ Đã tải dữ liệu dự phòng:', data);
              
              // Xử lý dữ liệu
              Object.keys(data).forEach(id => {
                if (!id.startsWith('_')) { // Bỏ qua metadata
                  const container = document.getElementById(id);
                  if (container) {
                    console.log('📦 Đang cập nhật container:', id);
                    
                    // Cập nhật giá
                    const productData = data[id];
                    if (productData.money) {
                      // Tìm phần tử hiển thị giá
                      const priceElements = container.querySelectorAll('[class*="title"], .title, .price, span, div, p');
                      for (let i = 0; i < priceElements.length; i++) {
                        const el = priceElements[i];
                        const text = el.textContent || '';
                        if (text.includes('Title') || text.includes('$') || text.includes('VND') || text.includes('Giá')) {
                          // Format giá
                          const formattedPrice = parseInt(productData.money).toLocaleString('vi-VN');
                          el.textContent = formattedPrice + ' VND';
                          break;
                        }
                      }
                    }
                    
                    // Cập nhật URL
                    if (productData.link_shopee) {
                      container.querySelectorAll('*').forEach(el => {
                        if ((el.outerHTML || '').toLowerCase().includes('shopee')) {
                          if (el.tagName === 'A') {
                            el.href = productData.link_shopee;
                            el.target = '_blank';
                          }
                        }
                      });
                    }
                    
                    if (productData.link_tiktok) {
                      container.querySelectorAll('*').forEach(el => {
                        if ((el.outerHTML || '').toLowerCase().includes('tiktok')) {
                          if (el.tagName === 'A') {
                            el.href = productData.link_tiktok;
                            el.target = '_blank';
                          }
                        }
                      });
                    }
                  }
                }
              });
            })
            .catch(err => console.error('❌ Lỗi khi tải dữ liệu dự phòng:', err));
        }
      }, 5000);
    }
  }, 3000);
})();

// Hard override bằng inline script - phương án cuối cùng
setTimeout(function() {
  console.log('🔍 Kiểm tra links cuối cùng...');
  var links = document.querySelectorAll('a');
  for (var i = 0; i < links.length; i++) {
    var href = links[i].href.toLowerCase();
    if (href.indexOf('shopee') > -1 || href.indexOf('tiktok') > -1) {
      links[i].target = '_blank';
    }
  }
}, 8000);
</script>
