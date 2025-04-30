/**
 * Product Display & Tracking Application
 * Version: 4.0.0 - FIX BỘ ĐỒNG BỘ GOOGLE SHEET - DORIK
 */

(function() {
  // Ngăn chạy nhiều lần
  if (window.ProductApp && window.ProductApp.initialized) {
    console.log("ProductApp đã được khởi tạo");
    return;
  }

  // Đối tượng ứng dụng chính
  const ProductApp = {
    // Thiết lập
    config: {
      // Thay đổi URL này thành URL Web App của bạn
      dataUrl: 'https://script.google.com/macros/s/AKfycbyCaZiTfkXdHGSO-YDLUbCF_ziDiQi-_flnAVVIMBSPD7&4JarjBulFPUgMYieP1T9ZYw/exec',
      loggerUrl: 'https://script.google.com/macros/s/AKfycbwiTGvwlmbqReewb4XXs5wJ3txCFrHk4HKaqNVBCF81U-Oly1H_Hey-tIFUq1uT535kLA/exec',
      cacheKey: 'product_data_v4',
      cacheExpiration: 30 * 1000, // 30 giây
      pollInterval: 5 * 1000,     // Kiểm tra dữ liệu mới mỗi 5 giây
      version: '4.0.0',
      debug: true,
      initialized: false
    },

    // Xử lý dữ liệu
    dataManager: {
      data: null,
      lastChecktime: 0,

      // Tải dữ liệu từ cache
      loadFromCache: function() {
        try {
          const cached = localStorage.getItem(ProductApp.config.cacheKey);
          if (!cached) return false;
          
          const parsedData = JSON.parse(cached);
          // Kiểm tra phiên bản cache
          if (!parsedData._metadata || parsedData._metadata.version !== ProductApp.config.version) {
            if (ProductApp.config.debug) console.log('Phiên bản cache không khớp, xóa cache');
            localStorage.removeItem(ProductApp.config.cacheKey);
            return false;
          }
          
          // Kiểm tra hết hạn
          const cacheTime = new Date(parsedData._metadata.updated_at).getTime();
          if (Date.now() - cacheTime > ProductApp.config.cacheExpiration) {
            if (ProductApp.config.debug) console.log('Cache đã hết hạn');
            return false;
          }
          
          this.data = parsedData;
          this.lastChecktime = cacheTime;
          if (ProductApp.config.debug) console.log('Đã tải dữ liệu từ cache, thời gian:', new Date(cacheTime).toLocaleString());
          return true;
        } catch (e) {
          console.error('Lỗi khi đọc cache:', e);
          return false;
        }
      },

      // Lưu dữ liệu vào cache
      saveToCache: function(data) {
        try {
          if (!data._metadata) {
            data._metadata = {
              updated_at: new Date().toISOString(),
              version: ProductApp.config.version
            };
          }
          localStorage.setItem(ProductApp.config.cacheKey, JSON.stringify(data));
          this.lastChecktime = Date.now();
          if (ProductApp.config.debug) console.log('Đã lưu dữ liệu vào cache');
        } catch (e) {
          console.error('Lỗi khi lưu cache:', e);
        }
      },

      // Tải dữ liệu từ API
      loadFromServer: function() {
        const timestamp = Date.now();
        const cacheBuster = timestamp + Math.random().toString(36).substring(2, 15);
        const url = ProductApp.config.dataUrl + '?t=' + cacheBuster;
        
        if (ProductApp.config.debug) console.log('Đang tải dữ liệu từ server:', url);
        
        return fetch(url)
          .then(response => {
            if (!response.ok) {
              throw new Error('Lỗi mạng: ' + response.status);
            }
            return response.json();
          })
          .then(data => {
            console.log('DỮ LIỆU NHẬN ĐƯỢC TỪ API:');
            console.log(JSON.stringify(data, null, 2));
            }
            
            // Cập nhật timestamp
            if (!data._metadata) data._metadata = {};
            data._metadata.updated_at = new Date().toISOString();
            data._metadata.version = ProductApp.config.version;
            
            this.data = data;
            this.saveToCache(data);
            
            if (ProductApp.config.debug) {
              console.log('Đã tải dữ liệu mới từ server:');
              console.log('- Số lượng sản phẩm:', Object.keys(data).filter(k => !k.startsWith('_')).length);
              console.log('- IDs:', Object.keys(data).filter(k => !k.startsWith('_')).join(', '));
            }
            
            return data;
          })
          .catch(error => {
            console.error('Lỗi khi tải dữ liệu từ server:', error);
            throw error;
          });
      },

      // Lấy dữ liệu cho container
      getDataForContainer: function(containerId) {
        if (!this.data) return null;
        
        // Tìm không phân biệt chữ hoa/thường
        containerId = containerId.toLowerCase();
        
        // Tìm trực tiếp
        if (this.data[containerId]) {
          return this.data[containerId];
        }
        
        // Tìm không phân biệt chữ hoa/thường
        for (const id in this.data) {
          if (id.toLowerCase() === containerId && !id.startsWith('_')) {
            return this.data[id];
          }
        }
        
        return null;
      }
    },

    // Xử lý giao diện
    uiManager: {
      // Cập nhật giá trị
      updateMoneyValue: function(container, value) {
        if (!value && value !== 0) return false;
        
        try {
          // Định dạng giá trị
          let formattedPrice;
          try {
            // Thử chuyển đổi sang số
            const numValue = parseInt(value);
            // Định dạng với dấu phẩy ngăn cách hàng nghìn
            formattedPrice = numValue.toLocaleString('vi-VN') + ' VND';
          } catch(e) {
            // Nếu lỗi, sử dụng giá trị gốc
            formattedPrice = value + ' VND';
          }
          
          // Cách 1: Tìm phần tử giá theo class và nội dung
          const priceElements = container.querySelectorAll('.icon-text-title, [class*="title"], .title, .price, .amount, [class*="price"], span, div, p');
          for (let i = 0; i < priceElements.length; i++) {
            const element = priceElements[i];
            const text = element.textContent || '';
            
            if (text.includes('Title') || text.includes('$') || 
                text.includes('VND') || text.includes('Giá') || 
                text.includes('Price') || /\d{3,}/.test(text)) {
              
              element.textContent = formattedPrice;
              if (ProductApp.config.debug) console.log('Đã cập nhật giá:', formattedPrice, 'cho container:', container.id);
              return true;
            }
          }
          
          // Cách 2: Tìm phần tử đầu tiên là span
          const firstSpan = container.querySelector('span:first-child, .price, .amount, [class*="price"]');
          if (firstSpan) {
            firstSpan.textContent = formattedPrice;
            if (ProductApp.config.debug) console.log('Fallback 1: Đã cập nhật giá cho phần tử đầu tiên');
            return true;
          }
          
          // Cách 3: Tìm bất kỳ phần tử span, p, div nào
          const anyText = container.querySelector('span, p, div');
          if (anyText) {
            anyText.textContent = formattedPrice;
            if (ProductApp.config.debug) console.log('Fallback 2: Đã cập nhật giá cho phần tử bất kỳ');
            return true;
          }
          
          if (ProductApp.config.debug) console.warn('Không tìm thấy phần tử để cập nhật giá cho container:', container.id);
          return false;
        } catch (error) {
          console.error('Lỗi khi cập nhật giá:', error);
          return false;
        }
      },

      // Xác định platform từ phần tử
      detectPlatformFromElement: function(element) {
        try {
          // Lấy tất cả thông tin từ phần tử
          const html = (element.outerHTML || '').toLowerCase();
          const src = (element.src || '').toLowerCase();
          const alt = (element.alt || '').toLowerCase();
          const className = (element.className || '').toLowerCase();
          const id = (element.id || '').toLowerCase();
          
          // Kiểm tra Shopee
          if (html.includes('shopee') || src.includes('shopee') || 
              alt.includes('shopee') || className.includes('shopee') ||
              id.includes('shopee') || html.includes('shop')) {
            return 'shopee';
          }
          
          // Kiểm tra TikTok
          if (html.includes('tiktok') || src.includes('tiktok') || 
              alt.includes('tiktok') || className.includes('tiktok') ||
              id.includes('tiktok') || html.includes('tik')) {
            return 'tiktok';
          }
          
          // Tìm trong các phần tử con
          const imgElements = element.querySelectorAll('img');
          for (let i = 0; i < imgElements.length; i++) {
            const img = imgElements[i];
            const imgSrc = (img.src || '').toLowerCase();
            const imgAlt = (img.alt || '').toLowerCase();
            const imgClass = (img.className || '').toLowerCase();
            
            if (imgSrc.includes('shopee') || imgAlt.includes('shopee') || imgClass.includes('shopee')) {
              return 'shopee';
            }
            
            if (imgSrc.includes('tiktok') || imgAlt.includes('tiktok') || imgClass.includes('tiktok')) {
              return 'tiktok';
            }
          }
          
          return 'unknown';
        } catch (error) {
          console.error('Lỗi khi phát hiện platform:', error);
          return 'unknown';
        }
      },

      // Cập nhật links cho các platform
      updatePlatformLinks: function(container, data) {
        try {
          let updated = false;
          
          // Kiểm tra dữ liệu đầu vào
          if (!data.link_shopee || !data.link_tiktok) {
            console.warn(`Container ${container.id}: Thiếu link Shopee hoặc TikTok`);
          }
          
          // Bước 1: Tìm tất cả các phần tử
          const allElements = container.querySelectorAll('*');
          
          // Bước 2: Xử lý từng phần tử
          allElements.forEach(element => {
            const platform = this.detectPlatformFromElement(element);
            if (platform === 'unknown') return;
            
            // Lấy URL tương ứng
            const url = platform === 'shopee' ? data.link_shopee : data.link_tiktok;
            if (!url) return;
            
            try {
              // Trường hợp 1: Element là thẻ A
              if (element.tagName === 'A') {
                element.href = url;
                element.setAttribute('target', '_blank');
                if (!element.onclick) {
                  element.onclick = function(e) {
                    ProductApp.trackingManager.logClick(container.id, platform);
                  };
                }
                updated = true;
                if (ProductApp.config.debug) console.log(`Đã cập nhật link ${platform} cho thẻ A: ${url}`);
              }
              // Trường hợp 2: Element không phải thẻ A và không nằm trong thẻ A
              else {
                let isInsideLink = false;
                let parent = element.parentNode;
                while (parent && parent !== document.body) {
                  if (parent.tagName === 'A') {
                    isInsideLink = true;
                    
                    // Cập nhật link cha
                    parent.href = url;
                    parent.setAttribute('target', '_blank');
                    if (!parent.onclick) {
                      parent.onclick = function(e) {
                        ProductApp.trackingManager.logClick(container.id, platform);
                      };
                    }
                    updated = true;
                    if (ProductApp.config.debug) console.log(`Đã cập nhật link ${platform} cho thẻ A cha: ${url}`);
                    break;
                  }
                  parent = parent.parentNode;
                }
                
                // Nếu không nằm trong link, tạo wrapper
                if (!isInsideLink) {
                  const wrapper = document.createElement('a');
                  wrapper.href = url;
                  wrapper.setAttribute('target', '_blank');
                  wrapper.style.cssText = 'cursor:pointer;text-decoration:none;color:inherit;display:inline-block;';
                  wrapper.onclick = function(e) {
                    e.stopPropagation();
                    ProductApp.trackingManager.logClick(container.id, platform);
                  };
                  
                  // Thay thế phần tử bằng wrapper
                  try {
                    element.parentNode.insertBefore(wrapper, element);
                    wrapper.appendChild(element);
                    updated = true;
                    if (ProductApp.config.debug) console.log(`Đã tạo wrapper link ${platform}: ${url}`);
                  } catch (err) {
                    console.error(`Lỗi khi tạo wrapper cho ${platform}:`, err);
                  }
                }
              }
            } catch (elementError) {
              console.error(`Lỗi xử lý phần tử ${platform}:`, elementError);
            }
          });
          
          // Bước 3: Đảm bảo tất cả links đều có target="_blank"
          container.querySelectorAll('a[href*="shopee"], a[href*="tiktok"]').forEach(link => {
            link.setAttribute('target', '_blank');
          });
          
          return updated;
        } catch (error) {
          console.error('Lỗi khi cập nhật links:', error);
          return false;
        }
      },

      // Cập nhật một container
      updateContainer: function(containerId) {
        try {
          // Tìm container
          const container = document.getElementById(containerId);
          if (!container) {
            if (ProductApp.config.debug) console.log(`Không tìm thấy container: ${containerId}`);
            return false;
          }
          
          // Đánh dấu container đã cập nhật
          if (container.getAttribute('data-updated') === 'true') {
            if (ProductApp.config.debug) console.log(`Container ${containerId} đã được cập nhật trước đó`);
            return true;
          }
          
          // Lấy dữ liệu
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
          
          // Cập nhật links
          if (this.updatePlatformLinks(container, data)) {
            updated = true;
          }
          
          // Đánh dấu container đã cập nhật
          if (updated) {
            container.setAttribute('data-updated', 'true');
            if (ProductApp.config.debug) console.log(`Container ${containerId} đã được cập nhật thành công`);
          }
          
          return updated;
        } catch (error) {
          console.error(`Lỗi khi cập nhật container ${containerId}:`, error);
          return false;
        }
      },

      // Cập nhật tất cả containers
      updateAllContainers: function() {
        try {
          if (!ProductApp.dataManager.data) {
            console.warn('Không có dữ liệu để cập nhật containers');
            return;
          }
          
          // Lấy danh sách IDs từ dữ liệu
          const containerIds = Object.keys(ProductApp.dataManager.data).filter(key => !key.startsWith('_'));
          
          // Tìm tất cả containers trên trang có ID trùng với dữ liệu
          let updatedCount = 0;
          const existingContainers = [];
          
          // Cập nhật các container đã biết ID
          containerIds.forEach(id => {
            const container = document.getElementById(id);
            if (container) {
              existingContainers.push(id);
              if (this.updateContainer(id)) {
                updatedCount++;
              }
            }
          });
          
          if (ProductApp.config.debug) {
            console.log(`Đã cập nhật ${updatedCount}/${existingContainers.length} containers`);
            if (existingContainers.length < containerIds.length) {
              console.log(`Không tìm thấy ${containerIds.length - existingContainers.length} containers trên trang`);
              console.log('IDs không tìm thấy:', containerIds.filter(id => !existingContainers.includes(id)));
            }
          }
          
          // GLOBAL HACK: Force target="_blank" cho links
          document.querySelectorAll('a[href*="shopee"], a[href*="tiktok"]').forEach(link => {
            if (link.target !== '_blank') {
              link.setAttribute('target', '_blank');
              if (ProductApp.config.debug) console.log('Global fix: Đã set target=_blank cho link:', link.href);
            }
          });
          
          return updatedCount;
        } catch (error) {
          console.error('Lỗi khi cập nhật containers:', error);
          return 0;
        }
      }
    },

    // Quản lý tracking
    trackingManager: {
      // Ghi log click
      logClick: function(productId, platform) {
        try {
          // Tạo pixel ẩn để ghi log
          const tracker = new Image();
          const params = new URLSearchParams({
            product_id: productId,
            platform: platform,
            user_agent: navigator.userAgent,
            url: window.location.href,
            timestamp: Date.now()
          });
          
          tracker.src = `${ProductApp.config.loggerUrl}?${params.toString()}`;
          tracker.style.display = 'none';
          
          if (ProductApp.config.debug) console.log(`Đã ghi log click cho ${productId} (${platform})`);
          
          // Thêm pixel vào DOM để đảm bảo request được gửi
          document.body.appendChild(tracker);
          setTimeout(() => {
            try { document.body.removeChild(tracker); } catch(e) {}
          }, 3000);
        } catch(error) {
          console.error('Lỗi khi gửi log:', error);
        }
      }
    },

    // Lazy loading
    lazyLoadManager: {
      observer: null,
      
      // Khởi tạo observer
     init: function() {
       if ('IntersectionObserver' in window) {
         this.observer = new IntersectionObserver((entries, observer) => {
           entries.forEach(entry => {
             if (entry.isIntersecting) {
               const containerId = entry.target.id;
               if (containerId) {
                 ProductApp.uiManager.updateContainer(containerId);
                 observer.unobserve(entry.target);
                 if (ProductApp.config.debug) console.log(`Lazy load: Đã tải container ${containerId}`);
               }
             }
           });
         }, {
           rootMargin: '200px', // Tải sớm hơn khi element cách viewport 200px
           threshold: 0.01      // Chỉ cần hiển thị 1% đã tải
         });
         
         // Tìm và theo dõi tất cả containers
         this.observeContainers();
       } else {
         // Fallback cho trình duyệt cũ
         if (ProductApp.config.debug) console.log('Trình duyệt không hỗ trợ IntersectionObserver, tải tất cả containers');
         ProductApp.uiManager.updateAllContainers();
       }
     },
     
     // Theo dõi các containers
     observeContainers: function() {
       try {
         if (!this.observer) return;
         
         // Tìm theo nhiều pattern container ID
         const containerPatterns = [
           '[id^="sp"]',           // sp01, sp02, ...
           '[id*="product"]',      // product1, my-product, ...
           '.product-container',   // Class product-container
           '[data-product]'        // Có attribute data-product
         ];
         
         const observedContainers = new Set();
         
         // Áp dụng tất cả patterns
         containerPatterns.forEach(selector => {
           try {
             document.querySelectorAll(selector).forEach(container => {
               if (container.id && !observedContainers.has(container.id)) {
                 this.observer.observe(container);
                 observedContainers.add(container.id);
                 if (ProductApp.config.debug) console.log(`Đang theo dõi container: ${container.id}`);
               }
             });
           } catch (err) {
             console.error(`Lỗi khi tìm containers với selector ${selector}:`, err);
           }
         });
         
         // Thêm theo dõi containers từ dữ liệu
         if (ProductApp.dataManager.data) {
           const containerIds = Object.keys(ProductApp.dataManager.data).filter(key => !key.startsWith('_'));
           containerIds.forEach(id => {
             const container = document.getElementById(id);
             if (container && !observedContainers.has(id)) {
               this.observer.observe(container);
               observedContainers.add(id);
               if (ProductApp.config.debug) console.log(`Đang theo dõi container từ dữ liệu: ${id}`);
             }
           });
         }
         
         if (ProductApp.config.debug) console.log(`Tổng số containers được theo dõi: ${observedContainers.size}`);
       } catch (error) {
         console.error('Lỗi khi khởi tạo lazy loading:', error);
       }
     }
   },
   
   // Xử lý DOM
   domManager: {
     // Đợi DOM sẵn sàng
     onDomReady: function(callback) {
       if (document.readyState === 'loading') {
         document.addEventListener('DOMContentLoaded', callback);
       } else {
         callback();
       }
     },
     
     // Theo dõi các thay đổi trên DOM (thêm containers mới)
     observeDomChanges: function() {
       try {
         if (!('MutationObserver' in window)) return;
         
         const observer = new MutationObserver((mutations) => {
           let needsContainerUpdate = false;
           
           mutations.forEach(mutation => {
             if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
               for (let i = 0; i < mutation.addedNodes.length; i++) {
                 const node = mutation.addedNodes[i];
                 if (node.nodeType === 1) { // Phần tử HTML
                   // Kiểm tra xem có phải container mới không
                   if (node.id && node.id.startsWith('sp')) {
                     needsContainerUpdate = true;
                     break;
                   }
                   
                   // Hoặc chứa containers con
                   if (node.querySelector && (
                       node.querySelector('[id^="sp"]') || 
                       node.querySelector('.product-container') ||
                       node.querySelector('[data-product]'))) {
                     needsContainerUpdate = true;
                     break;
                   }
                 }
               }
             }
           });
           
           // Nếu có thay đổi, cập nhật lại các containers
           if (needsContainerUpdate) {
             if (ProductApp.config.debug) console.log('Phát hiện thay đổi DOM: cập nhật containers');
             // Đợi một chút để DOM hoàn thành các thay đổi
             setTimeout(() => {
               ProductApp.lazyLoadManager.observeContainers();
               ProductApp.uiManager.updateAllContainers();
             }, 500);
           }
         });
         
         // Theo dõi toàn bộ body
         observer.observe(document.body, {
           childList: true,
           subtree: true
         });
         
         if (ProductApp.config.debug) console.log('Đã bắt đầu theo dõi thay đổi DOM');
       } catch (error) {
         console.error('Lỗi khi theo dõi DOM:', error);
       }
     },
     
     // Force fix cho các links
     forceFixLinks: function() {
       try {
         // Tìm tất cả links liên quan đến Shopee/TikTok
         document.querySelectorAll('a[href*="shopee"], a[href*="tiktok"]').forEach(link => {
           // Đảm bảo mở trong tab mới
           if (link.target !== '_blank') {
             link.setAttribute('target', '_blank');
             if (ProductApp.config.debug) console.log('DOM Fix: Đã set target=_blank cho:', link.href);
           }
           
           // Thêm tracking nếu chưa có
           if (!link.hasAttribute('data-tracked')) {
             const href = link.href.toLowerCase();
             const platform = href.includes('shopee') ? 'shopee' : 'tiktok';
             
             // Tìm container ID
             let containerId = null;
             let parent = link;
             while (parent && parent !== document.body) {
               if (parent.id && parent.id.startsWith('sp')) {
                 containerId = parent.id;
                 break;
               }
               parent = parent.parentElement;
             }
             
             // Thêm tracking
             if (containerId) {
               link.addEventListener('click', function(e) {
                 ProductApp.trackingManager.logClick(containerId, platform);
               });
               link.setAttribute('data-tracked', 'true');
               if (ProductApp.config.debug) console.log(`DOM Fix: Đã thêm tracking cho ${platform} link trong container ${containerId}`);
             }
           }
         });
       } catch (error) {
         console.error('Lỗi khi fix links:', error);
       }
     }
   },

   // Khởi tạo ứng dụng
   init: function() {
     try {
       console.log(`Khởi tạo ProductApp v${this.config.version}`);
       
       // Xóa các phiên bản cache cũ
       try {
         localStorage.removeItem('product_data_v1');
         localStorage.removeItem('product_data_v2');
         localStorage.removeItem('product_data_v3');
       } catch(e) {}
       
       // Đánh dấu đã khởi tạo
       this.config.initialized = true;
       
       // Đợi DOM sẵn sàng
       this.domManager.onDomReady(() => {
         // Tải dữ liệu từ cache nếu có
         const cacheLoaded = this.dataManager.loadFromCache();
         
         // Nếu có cache, cập nhật giao diện ngay
         if (cacheLoaded) {
           console.log('Đã tải dữ liệu từ cache');
           this.uiManager.updateAllContainers();
         }
         
         // Theo dõi thay đổi DOM
         this.domManager.observeDomChanges();
         
         // Khởi tạo lazy loading
         this.lazyLoadManager.init();
         
         // Force fix links
         this.domManager.forceFixLinks();
         
         // Tải dữ liệu mới từ server (ngay lập tức nếu không có cache)
         setTimeout(() => {
           this.dataManager.loadFromServer()
             .then(() => {
               console.log('Đã tải dữ liệu mới từ server');
               this.uiManager.updateAllContainers();
               this.lazyLoadManager.observeContainers();
             })
             .catch(error => {
               console.error('Không thể tải dữ liệu mới:', error);
             });
         }, cacheLoaded ? 1000 : 100);
         
         // Thiết lập polling để cập nhật dữ liệu định kỳ
         setInterval(() => {
           // Kiểm tra xem đã đến lúc check dữ liệu mới chưa
           const now = Date.now();
           if (now - this.dataManager.lastChecktime >= this.config.pollInterval) {
             this.dataManager.loadFromServer()
               .then(() => {
                 console.log('Đã tải dữ liệu mới từ server (polling)');
                 this.uiManager.updateAllContainers();
                 this.lazyLoadManager.observeContainers();
               })
               .catch(error => {
                 console.error('Lỗi polling:', error);
               });
           }
         }, this.config.pollInterval);
         
         // Force kiểm tra links liên tục
         setInterval(() => {
           this.domManager.forceFixLinks();
         }, 5000);
       });
       
       return true;
     } catch (error) {
       console.error('Lỗi khởi tạo ProductApp:', error);
       return false;
     }
   }
 };

 // Gán vào window để tránh chạy lại
 window.ProductApp = ProductApp;
 
 // Khởi tạo ngay
 ProductApp.init();
})();
