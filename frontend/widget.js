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
        }
        
        .pp-widget-icon {
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
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
          grid-template-columns: repeat(2, 1fr);
          gap: 12px;
          margin-bottom: 16px;
          position: relative;
          z-index: 1;
        }
        
        .pp-weather-item {
          background: rgba(255, 255, 255, 0.15);
          border-radius: 10px;
          padding: 12px;
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
      
      // Water-themed SVG icons for each condition level
      const conditionIcon = {
        beginner: `<svg width="50" height="50" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <!-- Calm water with paddle -->
          <path d="M3 12c0 0 2-3 5-3s5 3 5 3 2-3 5-3 6 3 6 3"/>
          <circle cx="12" cy="8" r="2" fill="white"/>
          <path d="M12 10v8"/>
          <path d="M9 18h6"/>
        </svg>`,
        intermediate: `<svg width="50" height="50" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <!-- Moderate waves -->
          <path d="M2 12c0 0 2-4 4-4s4 4 4 4 2-4 4-4 4 4 4 4 2-4 4-4"/>
          <path d="M2 16c0 0 2-3 4-3s4 3 4 3 2-3 4-3 4 3 4 3 2-3 4-3"/>
          <path d="M14 6l2-2m0 0l2 2m-2-2v4"/>
        </svg>`,
        advanced: `<svg width="50" height="50" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <!-- Strong waves with wind -->
          <path d="M2 10c0 0 2-5 4-5s4 5 4 5 2-5 4-5 4 5 4 5 2-5 4-5"/>
          <path d="M2 15c0 0 2-4 4-4s4 4 4 4 2-4 4-4 4 4 4 4"/>
          <path d="M2 20c0 0 2-3 4-3s4 3 4 3 2-3 4-3 4 3 4 3"/>
          <path d="M16 4l3-2m0 0l2 2m-2-2l-2 2"/>
          <path d="M18 8l3-2m0 0l2 2m-2-2l-2 2"/>
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
          
          <div class="pp-weather-details">
            <div class="pp-weather-item">
              <div class="pp-weather-label">Wind</div>
              <div class="pp-weather-value">${conditions.windSpeed} <span style="font-size: 14px;">mph</span></div>
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
