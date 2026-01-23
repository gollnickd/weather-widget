/**
 * Perfect Paddles Water Conditions Widget
 * Version 1.0.0
 * 
 * Usage:
 * <div id="pp-water-widget"></div>
 * <script src="https://your-domain.com/widget.js"></script>
 * <script>
 *   PPWaterWidget.init({
 *     containerId: 'pp-water-widget',
 *     apiKey: 'YOUR_API_KEY_HERE'
 *   });
 * </script>
 */

(function(window) {
  'use strict';
  
  const PPWaterWidget = {
    version: '1.0.0',
    config: {
      apiEndpoint: 'https://your-domain.com/api/widget/conditions',
      apiKey: null,
      refreshInterval: 10 * 60 * 1000, // 10 minutes
      containerId: 'pp-water-widget'
    },
    
    state: {
      refreshTimer: null,
      isInitialized: false
    },
    
    /**
     * Initialize the widget
     */
    init: function(options) {
      if (this.state.isInitialized) {
        console.warn('PPWaterWidget: Already initialized');
        return;
      }
      
      // Merge options with defaults
      Object.assign(this.config, options || {});
      
      if (!this.config.apiKey) {
        console.error('PPWaterWidget: API key is required');
        return;
      }
      
      // Inject styles
      this.injectStyles();
      
      // Initial fetch
      this.fetchConditions();
      
      // Handle visibility changes
      document.addEventListener('visibilitychange', () => {
        if (!document.hidden) {
          this.fetchConditions();
        }
      });
      
      this.state.isInitialized = true;
    },
    
    /**
     * Inject widget styles into page
     */
    injectStyles: function() {
      if (document.getElementById('pp-widget-styles')) return;
      
      const style = document.createElement('style');
      style.id = 'pp-widget-styles';
      style.textContent = `
        .pp-water-widget {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          max-width: 320px;
          background: linear-gradient(135deg, #0891B2 0%, #06A77D 100%);
          border-radius: 16px;
          padding: 20px;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
          color: white;
          position: relative;
          overflow: hidden;
        }
        
        .pp-water-widget::before {
          content: '';
          position: absolute;
          top: -50%;
          right: -50%;
          width: 200%;
          height: 200%;
          background: radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%);
          pointer-events: none;
        }
        
        .pp-widget-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 16px;
          position: relative;
          z-index: 1;
        }
        
        .pp-widget-logo {
          font-size: 18px;
          font-weight: 700;
          color: white;
          text-shadow: 0 2px 4px rgba(0,0,0,0.2);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        
        .pp-widget-icon {
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        
        .pp-wave-icon {
          font-size: 24px;
          line-height: 1;
        }
        
        .pp-condition-indicator {
          background: white;
          border-radius: 12px;
          padding: 24px;
          text-align: center;
          margin-bottom: 16px;
          position: relative;
          z-index: 1;
          box-shadow: 0 4px 16px rgba(0,0,0,0.1);
        }
        
        .pp-condition-circle {
          width: 80px;
          height: 80px;
          border-radius: 50%;
          margin: 0 auto 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.3s ease;
          box-shadow: 0 4px 16px rgba(0,0,0,0.15);
        }
        
        .pp-condition-level {
          font-size: 14px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 1px;
          color: #1F2937;
          margin-bottom: 8px;
        }
        
        .pp-condition-description {
          font-size: 13px;
          color: #6B7280;
          line-height: 1.5;
          margin: 0;
        }
        
        .pp-weather-details {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 10px;
          margin-bottom: 16px;
          position: relative;
          z-index: 1;
        }
        
        .pp-weather-item {
          background: rgba(255, 255, 255, 0.15);
          border-radius: 10px;
          padding: 10px 8px;
          text-align: center;
          backdrop-filter: blur(10px);
        }
        
        .pp-weather-label {
          font-size: 11px;
          opacity: 0.9;
          margin-bottom: 4px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        
        .pp-weather-value {
          font-size: 20px;
          font-weight: 700;
        }
        
        .pp-location-info {
          font-size: 12px;
          opacity: 0.9;
          margin-bottom: 12px;
          position: relative;
          z-index: 1;
        }
        
        .pp-location-name {
          font-weight: 600;
          margin-bottom: 2px;
        }
        
        .pp-customer-message {
          background: rgba(255, 255, 255, 0.25);
          border: 2px solid rgba(255, 255, 255, 0.4);
          border-radius: 12px;
          padding: 14px;
          margin-bottom: 16px;
          position: relative;
          z-index: 1;
          backdrop-filter: blur(10px);
          cursor: pointer;
          transition: all 0.2s;
        }
        
        .pp-customer-message:hover {
          background: rgba(255, 255, 255, 0.35);
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        }
        
        .pp-customer-message:active {
          transform: translateY(0);
        }
        
        .pp-message-icon {
          font-size: 18px;
          margin-bottom: 6px;
        }
        
        .pp-message-text {
          font-size: 14px;
          font-weight: 500;
          line-height: 1.4;
          color: white;
        }
        
        .pp-message-cta {
          font-size: 11px;
          opacity: 0.9;
          margin-top: 6px;
          display: flex;
          align-items: center;
          gap: 4px;
        }
        
        .pp-widget-footer {
          font-size: 10px;
          opacity: 0.8;
          text-align: center;
          position: relative;
          z-index: 1;
        }
        
        .pp-widget-loading {
          text-align: center;
          padding: 20px;
        }
        
        .pp-widget-error {
          background: #FEE2E2;
          color: #991B1B;
          padding: 12px;
          border-radius: 8px;
          font-size: 13px;
          text-align: center;
        }
        
        .pp-loading-spinner {
          border: 3px solid rgba(255, 255, 255, 0.3);
          border-top: 3px solid white;
          border-radius: 50%;
          width: 40px;
          height: 40px;
          animation: pp-spin 1s linear infinite;
          margin: 0 auto;
        }
        
        @keyframes pp-spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        .pp-wave-icon {
          font-size: 32px;
        }
        
        .pp-powered-by {
          margin-top: 8px;
          font-size: 9px;
          opacity: 0.7;
        }
        
        .pp-powered-by a {
          color: white;
          text-decoration: none;
          font-weight: 600;
        }
        
        .pp-powered-by a:hover {
          opacity: 0.8;
        }
      `;
      
      document.head.appendChild(style);
    },
    
    /**
     * Render the widget with data
     */
    renderWidget: function(data) {
      const container = document.getElementById(this.config.containerId);
      if (!container) return;
      
      const { location, conditions, lastUpdated } = data;
      const updateTime = new Date(lastUpdated);
      const formattedTime = updateTime.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
      
      const waveEmoji = {
        beginner: '🌊',
        intermediate: '🌊🌊',
        advanced: '🌊🌊🌊'
      }[conditions.level] || '🌊';
      
      // Dynamic weather-aware SVG icons
      // Determine weather overlay based on weather_condition and cloud_cover
      const weatherCondition = data.weather_condition ? data.weather_condition.toLowerCase() : '';
      const cloudCover = data.cloud_cover || 0;
      
      // Determine if sunny, partly cloudy, or cloudy
      let weatherOverlay = '';
      const isSunny = cloudCover < 30 || weatherCondition.includes('sunny') || weatherCondition.includes('clear');
      const isPartlyCloudy = (cloudCover >= 30 && cloudCover < 70) || weatherCondition.includes('partly') || weatherCondition.includes('overcast');
      const isCloudy = cloudCover >= 70 || weatherCondition.includes('cloudy') || weatherCondition.includes('overcast');
      
      if (isSunny) {
        // Orange sun in corner
        weatherOverlay = `<circle cx="38" cy="6" r="4" fill="#FF9500"/>
          <line x1="38" y1="1" x2="38" y2="3" stroke="#FF9500" stroke-width="1"/>
          <line x1="38" y1="9" x2="38" y2="11" stroke="#FF9500" stroke-width="1"/>
          <line x1="33" y1="6" x2="35" y2="6" stroke="#FF9500" stroke-width="1"/>
          <line x1="41" y1="6" x2="43" y2="6" stroke="#FF9500" stroke-width="1"/>
          <line x1="34.5" y1="2.5" x2="36" y2="4" stroke="#FF9500" stroke-width="1"/>
          <line x1="40" y1="8" x2="41.5" y2="9.5" stroke="#FF9500" stroke-width="1"/>
          <line x1="41.5" y1="2.5" x2="40" y2="4" stroke="#FF9500" stroke-width="1"/>
          <line x1="36" y1="8" x2="34.5" y2="9.5" stroke="#FF9500" stroke-width="1"/>`;
      } else if (isPartlyCloudy) {
        // Sun + clouds
        weatherOverlay = `<circle cx="38" cy="6" r="3" fill="#FF9500" opacity="0.7"/>
          <ellipse cx="36" cy="9" rx="4" ry="2.5" fill="white" opacity="0.9"/>
          <ellipse cx="40" cy="9" rx="3.5" ry="2" fill="white" opacity="0.9"/>`;
      } else if (isCloudy) {
        // Just clouds
        weatherOverlay = `<ellipse cx="36" cy="7" rx="4" ry="2.5" fill="white" opacity="0.95"/>
          <ellipse cx="40" cy="7" rx="4" ry="2.5" fill="white" opacity="0.95"/>
          <ellipse cx="38" cy="5" rx="3" ry="2" fill="white" opacity="0.95"/>`;
      }
      
      const conditionIcon = {
        beginner: `<svg width="50" height="50" viewBox="0 0 48 48" fill="none">
          <!-- Calm flat water - blue -->
          <path d="M 4 24 Q 10 22 16 24 T 28 24 T 40 24 T 44 24" 
                stroke="#3B82F6" stroke-width="2.5" fill="none" stroke-linecap="round"/>
          <path d="M 4 28 Q 10 26 16 28 T 28 28 T 40 28 T 44 28" 
                stroke="#3B82F6" stroke-width="2" fill="none" opacity="0.6" stroke-linecap="round"/>
          ${weatherOverlay}
        </svg>`,
        intermediate: `<svg width="50" height="50" viewBox="0 0 48 48" fill="none">
          <!-- Small blue waves -->
          <path d="M 4 24 Q 8 18 12 24 T 20 24 Q 24 18 28 24 T 36 24 Q 40 18 44 24" 
                stroke="#3B82F6" stroke-width="2.5" fill="none" stroke-linecap="round"/>
          <path d="M 4 30 Q 8 26 12 30 T 20 30 Q 24 26 28 30 T 36 30 Q 40 26 44 30" 
                stroke="#3B82F6" stroke-width="2" fill="none" opacity="0.7" stroke-linecap="round"/>
          ${weatherOverlay}
        </svg>`,
        advanced: `<svg width="50" height="50" viewBox="0 0 48 48" fill="none">
          <!-- Big blue waves -->
          <path d="M 4 20 Q 8 12 12 20 T 20 20 Q 24 12 28 20 T 36 20 Q 40 12 44 20" 
                stroke="#3B82F6" stroke-width="3" fill="none" stroke-linecap="round"/>
          <path d="M 4 26 Q 8 18 12 26 T 20 26 Q 24 18 28 26 T 36 26 Q 40 18 44 26" 
                stroke="#3B82F6" stroke-width="2.5" fill="none" opacity="0.8" stroke-linecap="round"/>
          <path d="M 4 32 Q 8 26 12 32 T 20 32 Q 24 26 28 32 T 36 32 Q 40 26 44 32" 
                stroke="#3B82F6" stroke-width="2" fill="none" opacity="0.6" stroke-linecap="round"/>
          ${weatherOverlay}
        </svg>`
      }[conditions.level] || conditionIcon.beginner;
      
      container.innerHTML = `
        <div class="pp-water-widget">
          <div class="pp-widget-header">
            <div class="pp-widget-logo">Perfect Paddles</div>
            <div class="pp-widget-icon">
              <span class="pp-wave-icon">${waveEmoji}</span>
            </div>
          </div>
          
          <div class="pp-condition-indicator">
            <div class="pp-condition-circle" style="background-color: ${conditions.color};">
              ${conditionIcon}
            </div>
            <div class="pp-condition-level">${conditions.level} Friendly</div>
            <p class="pp-condition-description">${conditions.description}</p>
          </div>
          
          ${data.customerMessage ? this.renderCustomerMessage(data.customerMessage) : ''}
          
          <div class="pp-weather-details">
            <div class="pp-weather-item">
              <div class="pp-weather-label">Wind</div>
              <div class="pp-weather-value">${conditions.windSpeed} <span style="font-size: 14px;">mph</span></div>
            </div>
            <div class="pp-weather-item">
              <div class="pp-weather-label">Waves</div>
              <div class="pp-weather-value">${conditions.waveHeight !== undefined && conditions.waveHeight !== null ? conditions.waveHeight : '~'} <span style="font-size: 14px;">ft</span></div>
            </div>
            <div class="pp-weather-item">
              <div class="pp-weather-label">Temp</div>
              <div class="pp-weather-value">${conditions.temperature}° <span style="font-size: 14px;">F</span></div>
            </div>
          </div>
          
          <div class="pp-location-info">
            <div class="pp-location-name">${location.name}</div>
            <div>${location.waterBody ? location.waterBody + ', ' : ''}${location.city}, ${location.state}</div>
          </div>
          
          <div class="pp-widget-footer">
            Last updated: ${formattedTime}
            <div class="pp-powered-by">
              Powered by <a href="https://perfectpaddles.com" target="_blank">Perfect Paddles</a>
            </div>
          </div>
        </div>
      `;
    },
    
    /**
     * Render customer message
     */
    renderCustomerMessage: function(message) {
      if (!message || !message.text) return '';
      
      const ctaIcon = {
        'phone': '📞',
        'url': '🌐',
        'none': ''
      }[message.ctaType] || '';
      
      const ctaText = {
        'phone': 'Tap to call',
        'url': 'Visit website',
        'none': ''
      }[message.ctaType] || '';
      
      const messageHtml = `
        <div class="pp-customer-message" onclick="PPWaterWidget.handleMessageClick('${message.id}', '${message.ctaType}', '${message.ctaValue || ''}')">
          <div class="pp-message-icon">📢</div>
          <div class="pp-message-text">${this.escapeHtml(message.text)}</div>
          ${message.ctaType !== 'none' ? `
            <div class="pp-message-cta">
              ${ctaIcon} ${ctaText} →
            </div>
          ` : ''}
        </div>
      `;
      
      // Track message view
      this.trackMessageView(message.id);
      
      return messageHtml;
    },
    
    /**
     * Handle message click
     */
    handleMessageClick: function(messageId, ctaType, ctaValue) {
      // Track click
      this.trackMessageClick(messageId);
      
      if (ctaType === 'phone' && ctaValue) {
        window.location.href = `tel:${ctaValue}`;
      } else if (ctaType === 'url' && ctaValue) {
        window.open(ctaValue, '_blank');
      }
    },
    
    /**
     * Track message view
     */
    trackMessageView: function(messageId) {
      if (!messageId) return;
      
      fetch(`${this.config.apiEndpoint.replace('/widget/conditions', '')}/messages/${messageId}/view`, {
        method: 'POST'
      }).catch(err => console.error('Failed to track view:', err));
    },
    
    /**
     * Track message click
     */
    trackMessageClick: function(messageId) {
      if (!messageId) return;
      
      fetch(`${this.config.apiEndpoint.replace('/widget/conditions', '')}/messages/${messageId}/click`, {
        method: 'POST'
      }).catch(err => console.error('Failed to track click:', err));
    },
    
    /**
     * Escape HTML to prevent XSS
     */
    escapeHtml: function(text) {
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    },
    
    /**
     * Render loading state
     */
    renderLoading: function() {
      const container = document.getElementById(this.config.containerId);
      if (!container) return;
      
      container.innerHTML = `
        <div class="pp-water-widget">
          <div class="pp-widget-loading">
            <div class="pp-loading-spinner"></div>
            <p style="margin-top: 12px; font-size: 13px;">Loading conditions...</p>
          </div>
        </div>
      `;
    },
    
    /**
     * Render error state
     */
    renderError: function(message) {
      const container = document.getElementById(this.config.containerId);
      if (!container) return;
      
      container.innerHTML = `
        <div class="pp-water-widget">
          <div class="pp-widget-error">
            <strong>Unable to load conditions</strong><br>
            ${message}
          </div>
        </div>
      `;
    },
    
    /**
     * Fetch weather conditions from API
     */
    fetchConditions: async function() {
      try {
        this.renderLoading();
        
        const response = await fetch(
          `${this.config.apiEndpoint}/${this.config.apiKey}`,
          {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json'
            }
          }
        );
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        
        const data = await response.json();
        
        // Update refresh interval from API if provided
        if (data.refreshInterval) {
          this.config.refreshInterval = data.refreshInterval;
          console.log(`PPWaterWidget: Using refresh interval ${data.refreshInterval / 1000}s from API`);
        }
        
        this.renderWidget(data);
        
        // Schedule next refresh
        this.scheduleRefresh();
        
      } catch (error) {
        console.error('PPWaterWidget error:', error);
        this.renderError('Please try again later');
        
        // Retry after 1 minute on error
        setTimeout(() => this.fetchConditions(), 60000);
      }
    },
    
    /**
     * Schedule automatic refresh
     */
    scheduleRefresh: function() {
      if (this.state.refreshTimer) {
        clearTimeout(this.state.refreshTimer);
      }
      this.state.refreshTimer = setTimeout(
        () => this.fetchConditions(),
        this.config.refreshInterval
      );
    },
    
    /**
     * Manual refresh
     */
    refresh: function() {
      this.fetchConditions();
    },
    
    /**
     * Destroy widget
     */
    destroy: function() {
      if (this.state.refreshTimer) {
        clearTimeout(this.state.refreshTimer);
      }
      
      const container = document.getElementById(this.config.containerId);
      if (container) {
        container.innerHTML = '';
      }
      
      this.state.isInitialized = false;
    }
  };
  
  // Expose to global scope
  window.PPWaterWidget = PPWaterWidget;
  
})(window);
