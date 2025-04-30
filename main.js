/**
 * Product Display & Tracking Application - Simplified Version
 * Version: 4.2.0 - PHIÊN BẢN ĐƠN GIẢN HÓA
 * Cập nhật: Sử dụng data.js thay vì API, bỏ chức năng logging
 */

(function() {
  // Ngăn chạy nhiều lần
  if (window.ProductApp && window.ProductApp.initialized) {
    console.log("ProductApp đã được khởi tạo - Version " + (window.ProductApp.config ? window.ProductApp.config.version : "unknown"));
    return;
  }

  // Đối tượng ứng dụng chính
  const ProductApp = {
    // Thiết lập
    config: {
      dataUrl: null, // Không sử dụng API
      useLocalData: true, // Sử dụng dữ liệu từ data.js
      cacheKey: 'product_data_v4_2',
      version: '4.2.0',
      debug: true,
      initialized: false
    },

    // Xử lý dữ liệu
    dataManager: {
      data: null,
      lastChecktime: 0,

      // Khởi tạo dữ liệu từ data.js
      initData: function() {
        try {
          if (typeof PRODUCT_DATA !== 'undefined') {
            this.data = PRODUCT_DATA;
            this.lastChecktime = Date.now();
            
            if (ProductApp.config.debug) {
              console.log('Đã tải dữ liệu từ PRODUCT_DATA:');
              const containers = Object.keys(this.data).filter(k => !k.startsWith('_'));
              console.log('- Số lượng container:', containers.length);
              console.log('- IDs:', containers.join(', '));
            }
            
            return true;
          } else {
            console.error('PRODUCT_DATA không được định nghĩa! Vui lòng thêm data.js trước main.js');
            return false;
          }
        } catch (e) {
          console.error('Lỗi khi khởi tạo dữ liệu:', e);
          return false;
        }
      },

      // Lấy dữ liệu cho container
      getDataForContainer: function(containerId) {
        if (!this.data) return null;
        if (!containerId) return null;
        
        // Chuyển về string và lowercase
        containerId = String(containerId).toLowerCase().trim();
        
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
      },
      
      // In ra console toàn bộ dữ liệu để debug
      debugData: function() {
        if (!this.data) {
          console.log('Không có dữ liệu!');
          return;
        }
        
        const containers = Object.keys(this.data).filter(k => !k.startsWith('_'));
        console.log(`=== DỮ LIỆU HIỆN TẠI (${containers.length} containers) ===`);
        
        containers.forEach(id => {
          const container = this.data[id];
          console.log(`- Container ${id}:`);
          console.log(`  Money: ${container.money}`);
          console.log(`  Link Shopee: ${container.link_shopee}`);
          console.log(`  Link TikTok: ${container.link_tiktok}`);
        });
        
        if (this.data._metadata) {
          console.log('=== METADATA ===');
          console.log('- Thời gian cập nhật:', this.data._metadata.updated_at);
          console.log('- Phiên bản:', this.data._metadata.version);
        }
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
          
          // Nếu đã có định dạng số (150,000), sử dụng trực tiếp
          if (typeof value === 'string' && value.includes(',')) {
            formattedPrice = value + ' VND';
          } else {
            try {
              // Thử chuyển đổi sang số
              const numValue = parseInt(value);
              // Định dạng với dấu phẩy ngăn cách hàng nghìn
              formattedPrice = numValue.toLocaleString('vi-VN') + ' VND';
            } catch(e) {
              // Nếu lỗi, sử dụng giá trị gốc
              formattedPrice = value + ' VND';
            }
          }
          
          // Cách 1: Tìm phần tử giá theo class và nội dung
          const priceSelectors = [
            '.icon-text-title', '[class*="title"]', '.title', '.price', 
            '.amount', '[class*="price"]', 'span', 'div', 'p'
          ];
          
          // Thử tất cả các selector
          for (const selector of priceSelectors) {
            const elements = container.querySelectorAll(selector);
            
            for (let i = 0; i < elements.length; i++) {
              const element = elements[i];
              const text = element.textContent || '';
              
              if (text.includes('Title') || text.includes('$') || 
                  text.includes('VND') || text.includes('Giá') || 
                  text.includes('Price') || /\d{3,}/.test(text)) {
                
                element.textContent = formattedPrice;
                if (ProductApp.config.debug) console.log(`Đã cập nhật giá: ${formattedPrice} cho container: ${container.id}`);
                return true;
              }
            }
          }
          
          // Cách 2: Tìm phần tử đầu tiên là span
          const firstSpan = container.querySelector('span:first-child, .price, .amount, [class*="price"]');
          if (firstSpan) {
            firstSpan.textContent = formattedPrice;
            if (ProductApp.config.debug) console.log(`Fallback 1: Đã cập nhật giá cho phần tử đầu tiên trong ${container.id}`);
            return true;
          }
          
          // Cách 3: Tìm bất kỳ phần tử span, p, div nào
          const anyText = container.querySelector('span, p, div');
          if (anyText) {
            anyText.textContent = formattedPrice;
            if (ProductApp.config.debug) console.log(`Fallback 2: Đã cập nhật giá cho phần tử bất kỳ trong ${container.id}`);
            return true;
          }
          
          if (ProductApp.config.debug) console.warn(`Không tìm thấy phần tử để cập nhật giá cho container: ${container.id}`);
          return false;
        } catch (error) {
          console.error(`Lỗi khi cập nhật giá cho ${container.id}:`, error);
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
          const text = (element.textContent || '').toLowerCase();
          
          // Kiểm tra Shopee
          if (html.includes('shopee') || src.includes('shopee') || 
              alt.includes('shopee') || className.includes('shopee') ||
              id.includes('shopee') || html.includes('shop') ||
              text.includes('shopee') || text.includes('shop')) {
            return 'shopee';
          }
          
          // Kiểm tra TikTok
          if (html.includes('tiktok') || src.includes('tiktok') || 
              alt.includes('tiktok') || className.includes('tiktok') ||
              id.includes('tiktok') || html.includes('tik') ||
              text.includes('tiktok') || text.includes('tik tok')) {
            return 'tiktok';
          }
          
          // Tìm trong các phần tử con
          const imgElements = element.querySelectorAll('img');
          for (let i = 0; i < imgElements.length; i++) {
            const img = imgElements[i];
            const imgSrc = (img.src || '').toLowerCase();
            const imgAlt = (img.alt || '').toLowerCase();
            const imgClass = (img.className || '').toLowerCase();
            
            if (imgSrc.includes('shopee') || imgAlt.includes('shopee') || imgClass.includes('shopee') ||
                imgSrc.includes('shop') || imgAlt.includes('shop')) {
              return 'shopee';
            }
            
            if (imgSrc.includes('tiktok') || imgAlt.includes('tiktok') || imgClass.includes('tiktok') ||
                imgSrc.includes('tik') || imgAlt.includes('tik')) {
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
          if (!data.link_shopee && !data.link_tiktok) {
            console.warn(`Container ${container.id}: Thiếu cả link Shopee và TikTok`);
            return false;
          }
          
          // Bước 1: Tìm tất cả các phần tử
          const allElements = container.querySelectorAll('*');
          const shopeeElements = [];
          const tiktokElements = [];
          
          // Tìm tất cả phần tử Shopee và TikTok
          allElements.forEach(element => {
            const platform = this.detectPlatformFromElement(element);
            if (platform === 'shopee') {
              shopeeElements.push(element);
            } else if (platform === 'tiktok') {
              tiktokElements.push(element);
            }
          });
          
          if (ProductApp.config.debug) {
            console.log(`Container ${container.id}: Tìm thấy ${shopeeElements.length} phần tử Shopee và ${tiktokElements.length} phần tử TikTok`);
          }
          
          // Xử lý elements Shopee
          if (data.link_shopee) {
            shopeeElements.forEach(element => {
              this.makeElementClickable(element, data.link_shopee, 'shopee', container.id);
              updated = true;
            });
          }
          
          // Xử lý elements TikTok
          if (data.link_tiktok) {
            tiktokElements.forEach(element => {
              this.makeElementClickable(element, data.link_tiktok, 'tiktok', container.id);
              updated = true;
            });
          }
          
          // Bước 3: Đảm bảo tất cả links đều có target="_blank"
          container.querySelectorAll('a[href*="shopee"], a[href*="tiktok"]').forEach(link => {
            link.setAttribute('target', '_blank');
            link.setAttribute('rel', 'noopener');
          });
          
          return updated;
        } catch (error) {
          console.error(`Lỗi khi cập nhật links cho ${container.id}:`, error);
          return false;
        }
      },
      
      // Làm cho element có thể click
      makeElementClickable: function(element, url, platform, containerId) {
        try {
          // Trường hợp 1: Element là thẻ A
          if (element.tagName === 'A') {
            element.href = url;
            element.setAttribute('target', '_blank');
            element.setAttribute('rel', 'noopener');
            
            if (!element.hasAttribute('data-platform')) {
              element.setAttribute('data-platform', platform);
              element.setAttribute('data-container', containerId);
              
              if (ProductApp.config.debug) console.log(`Đã cập nhật link ${platform} cho thẻ A: ${url}`);
            }
            return true;
          }
          
          // Trường hợp 2: Kiểm tra nếu đã nằm trong link
          let parentLink = null;
          let parent = element.parentNode;
          
          while (parent && parent !== document.body) {
            if (parent.tagName === 'A') {
              parentLink = parent;
              break;
            }
            parent = parent.parentNode;
          }
          
          // Nếu đã nằm trong link, cập nhật link đó
          if (parentLink) {
            parentLink.href = url;
            parentLink.setAttribute('target', '_blank');
            parentLink.setAttribute('rel', 'noopener');
            
            if (!parentLink.hasAttribute('data-platform')) {
              parentLink.setAttribute('data-platform', platform);
              parentLink.setAttribute('data-container', containerId);
              
              if (ProductApp.config.debug) console.log(`Đã cập nhật link ${platform} cho thẻ A cha: ${url}`);
            }
            return true;
          }
          
          // Trường hợp 3: Cần tạo wrapper link mới
          if (element.parentNode) {
            // Kiểm tra xem phần tử có thể wrap được không
            try {
              const wrapper = document.createElement('a');
              wrapper.href = url;
              wrapper.setAttribute('target', '_blank');
              wrapper.setAttribute('rel', 'noopener');
              wrapper.setAttribute('data-platform', platform);
              wrapper.setAttribute('data-container', containerId);
              wrapper.style.cssText = 'cursor:pointer;text-decoration:none;color:inherit;display:inline-block;';
              
              // Thay thế phần tử bằng wrapper
              element.parentNode.insertBefore(wrapper, element);
              wrapper.appendChild(element);
              
              if (ProductApp.config.debug) console.log(`Đã tạo wrapper link ${platform}: ${url}`);
              return true;
            } catch (err) {
              console.error(`Lỗi khi tạo wrapper cho ${platform}:`, err);
              
              // Fallback: Thêm xử lý click trực tiếp lên phần tử
              element.style.cursor = 'pointer';
              element.setAttribute('data-url', url);
              element.setAttribute('data-platform', platform);
              element.setAttribute('data-container', containerId);
              
              // Thêm click handler
              element.addEventListener('click', function() {
                window.open(url, '_blank');
              });
              
              if (ProductApp.config.debug) console.log(`Đã thêm click handler trực tiếp cho ${platform}`);
              return true;
            }
          }
          
          return false;
        } catch (error) {
          console.error(`Lỗi khi làm phần tử ${platform} clickable:`, error);
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
            container.setAttribute('data-updated-time', new Date().toISOString());
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
            return 0;
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
          
          // Force-fix: Thêm xử lý click cho tất cả hình ảnh Shopee/TikTok
          this.fixAllPlatformImages();
          
          return updatedCount;
        } catch (error) {
          console.error('Lỗi khi cập nhật containers:', error);
          return 0;
        }
      },
      
      // Fix tất cả hình ảnh platform
      fixAllPlatformImages: function() {
        try {
          // Tìm tất cả hình ảnh Shopee và TikTok
          const shopeeImages = document.querySelectorAll('img[src*="shopee"], img[alt*="shopee"]');
          const tiktokImages = document.querySelectorAll('img[src*="tiktok"], img[alt*="tiktok"]');
          
          if (ProductApp.config.debug) {
            console.log(`Tìm thấy ${shopeeImages.length} hình ảnh Shopee và ${tiktokImages.length} hình ảnh TikTok để fix`);
          }
          
          // Xử lý hình ảnh Shopee
          shopeeImages.forEach(img => {
            this.fixPlatformImage(img, 'shopee');
          });
          
          // Xử lý hình ảnh TikTok
          tiktokImages.forEach(img => {
            this.fixPlatformImage(img, 'tiktok');
          });
          
          // Force all links to open in new tab
          document.querySelectorAll('a[href*="shopee"], a[href*="tiktok"]').forEach(link => {
            if (link.target !== '_blank') {
              link.setAttribute('target', '_blank');
              link.setAttribute('rel', 'noopener');
            }
          });
        } catch (error) {
          console.error('Lỗi khi fix hình ảnh platform:', error);
        }
      },
      
      // Fix một hình ảnh platform
      fixPlatformImage: function(img, platform) {
        try {
          // Đã có click handler
          if (img.hasAttribute('data-fixed')) return;
          
          // Tìm container
          let container = img;
          let containerId = null;
          
          while (container && container !== document.body) {
            if (container.id && container.id.startsWith('sp')) {
              containerId = container.id;
              break;
            }
            container = container.parentElement;
          }
          
          // Không tìm thấy container
          if (!containerId) return;
          
          // Lấy dữ liệu
          const data = ProductApp.dataManager.getDataForContainer(containerId);
          if (!data) return;
          
          // Lấy link tương ứng
          const url = platform === 'shopee' ? data.link_shopee : data.link_tiktok;
          if (!url) return;
          
          // Kiểm tra nếu nằm trong thẻ A
          let isInsideLink = false;
          let parent = img.parentNode;
          
          while (parent && parent !== document.body) {
            if (parent.tagName === 'A') {
              isInsideLink = true;
              
              // Cập nhật link
              parent.href = url;
              parent.setAttribute('target', '_blank');
              parent.setAttribute('rel', 'noopener');
              
              img.setAttribute('data-fixed', 'true');
              if (ProductApp.config.debug) console.log(`Fix: Đã cập nhật link cho hình ${platform} trong container ${containerId}`);
              break;
            }
            parent = parent.parentNode;
          }
          
          // Nếu không nằm trong link
          if (!isInsideLink) {
            // Tạo wrapper
            const wrapper = document.createElement('a');
            wrapper.href = url;
            wrapper.setAttribute('target', '_blank');
            wrapper.setAttribute('rel', 'noopener');
            wrapper.style.cursor = 'pointer';
            
            // Thay thế hình ảnh
            try {
              img.parentNode.insertBefore(wrapper, img);
              wrapper.appendChild(img);
              img.setAttribute('data-fixed', 'true');
              if (ProductApp.config.debug) console.log(`Fix: Đã tạo wrapper link cho hình ${platform} trong container ${containerId}`);
            } catch (err) {
              // Fallback: Thêm click handler trực tiếp
              img.style.cursor = 'pointer';
              img.onclick = function() {
                window.open(url, '_blank');
              };
              img.setAttribute('data-fixed', 'true');
              if (ProductApp.config.debug) console.log(`Fix: Đã thêm click handler cho hình ${platform} trong container ${containerId}`);
            }
          }
        } catch (error) {
          console.error(`Lỗi khi fix hình ảnh ${platform}:`, error);
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
                       node.querySelector('[data-product]') ||
                       node.querySelector('img[src*="shopee"]') ||
                       node.querySelector('img[src*="tiktok"]'))) {
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
             link.setAttribute('rel', 'noopener');
             if (ProductApp.config.debug) console.log('DOM Fix: Đã set target=_blank cho:', link.href);
           }
         });
         
         // Fix thêm cho các hình ảnh Shopee/TikTok
         ProductApp.uiManager.fixAllPlatformImages();
       } catch (error) {
         console.error('Lỗi khi fix links:', error);
       }
     },
     
     // Thêm CSS global
     addGlobalCSS: function() {
       try {
         const style = document.createElement('style');
         style.textContent = `
           [data-platform="shopee"], img[src*="shopee"], a[href*="shopee"] {
             cursor: pointer !important;
           }
           [data-platform="tiktok"], img[src*="tiktok"], a[href*="tiktok"] {
             cursor: pointer !important;
           }
         `;
         document.head.appendChild(style);
       } catch (error) {
         console.error('Lỗi khi thêm CSS:', error);
       }
     }
   },
   
   // Chức năng sửa lỗi icon không click được
   iconFixer: {
     init: function() {
       // Thêm click handler trực tiếp cho tất cả hình ảnh
       this.addDirectClickHandlers();
       
       // Thiết lập interval để kiểm tra và fix liên tục
       setInterval(() => {
         this.addDirectClickHandlers();
       }, 5000);
     },
     
     // Thêm click handler trực tiếp vào hình ảnh
     addDirectClickHandlers: function() {
       try {
         // Tìm tất cả hình ảnh Shopee và TikTok chưa có handler
         const shopeeImages = document.querySelectorAll('img[src*="shopee"]:not([data-direct-handler]), img[alt*="shopee"]:not([data-direct-handler])');
         const tiktokImages = document.querySelectorAll('img[src*="tiktok"]:not([data-direct-handler]), img[alt*="tiktok"]:not([data-direct-handler])');
         
         if (shopeeImages.length > 0 || tiktokImages.length > 0) {
           if (ProductApp.config.debug) {
             console.log(`IconFixer: Tìm thấy ${shopeeImages.length} hình Shopee và ${tiktokImages.length} hình TikTok cần fix`);
           }
         }
         
         // Xử lý hình ảnh Shopee
         shopeeImages.forEach(img => {
           this.addHandlerToImage(img, 'shopee');
         });
         
         // Xử lý hình ảnh TikTok
         tiktokImages.forEach(img => {
           this.addHandlerToImage(img, 'tiktok');
         });
         
         return shopeeImages.length + tiktokImages.length;
       } catch (error) {
         console.error('Lỗi khi thêm click handlers:', error);
         return 0;
       }
     },
     
     // Thêm handler vào một hình ảnh
     addHandlerToImage: function(img, platform) {
       try {
         // Đánh dấu đã xử lý
         img.setAttribute('data-direct-handler', 'true');
         
         // Tìm container ID
         let containerId = null;
         let container = img;
         
         while (container && container !== document.body) {
           if (container.id && container.id.startsWith('sp')) {
             containerId = container.id;
             break;
           }
           container = container.parentElement;
         }
         
         // Nếu không tìm thấy container, sử dụng đường dẫn mặc định
         let defaultUrl = platform === 'shopee' ? 'https://shopee.vn' : 'https://www.tiktok.com';
         
         // Lấy URL từ dữ liệu nếu có
         let url = defaultUrl;
         if (containerId && ProductApp.dataManager.data) {
           const data = ProductApp.dataManager.getDataForContainer(containerId);
           if (data) {
             url = platform === 'shopee' ? (data.link_shopee || defaultUrl) : (data.link_tiktok || defaultUrl);
           }
         }
         
         // Làm cho hình ảnh có thể click
         img.style.cursor = 'pointer';
         
         // Thêm click handler
         img.addEventListener('click', function(e) {
           // Ngăn các sự kiện khác
           e.preventDefault();
           e.stopPropagation();
           
           // Mở link trong tab mới
           window.open(url, '_blank');
           
           if (ProductApp.config.debug) {
             console.log(`IconFixer: Click trực tiếp vào ${platform} (${containerId || 'unknown'}) - ${url}`);
           }
           
           return false;
         });
         
         if (ProductApp.config.debug) {
           console.log(`IconFixer: Đã thêm handler cho hình ${platform} (${containerId || 'unknown'})`);
         }
       } catch (error) {
         console.error(`Lỗi khi xử lý hình ${platform}:`, error);
       }
     }
   },

   // Khởi tạo ứng dụng
   init: function() {
     try {
       console.log(`Khởi tạo ProductApp v${this.config.version} - PHIÊN BẢN ĐƠN GIẢN HÓA`);
       
       // Đánh dấu đã khởi tạo
       this.config.initialized = true;
       
       // Thêm CSS global
       this.domManager.addGlobalCSS();
       
       // Đợi DOM sẵn sàng
       this.domManager.onDomReady(() => {
         // Khởi tạo dữ liệu
         if (!this.dataManager.initData()) {
           console.error("Không thể khởi tạo dữ liệu! Vui lòng kiểm tra script data.js");
           return;
         }
         
         // Khởi tạo IconFixer (FIX CHÍNH CHO ISSUE ICON KHÔNG CLICK ĐƯỢC)
         this.iconFixer.init();
         
         // In dữ liệu để debug
         this.dataManager.debugData();
           
         // Theo dõi thay đổi DOM
         this.domManager.observeDomChanges();
         
         // Khởi tạo lazy loading
         this.lazyLoadManager.init();
         
         // Force fix links
         this.domManager.forceFixLinks();
         
         // Cập nhật tất cả containers
         setTimeout(() => {
           this.uiManager.updateAllContainers();
         }, 500);
         
         // Force kiểm tra links liên tục
         setInterval(() => {
           this.domManager.forceFixLinks();
         }, 5000);
         
         // Fix lỗi có thể xảy ra sau khi trang đã load hoàn toàn
         window.addEventListener('load', () => {
           setTimeout(() => {
             this.iconFixer.addDirectClickHandlers();
             this.uiManager.fixAllPlatformImages();
             this.domManager.forceFixLinks();
           }, 2000);
         });
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
