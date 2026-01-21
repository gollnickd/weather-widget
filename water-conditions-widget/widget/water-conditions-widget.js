/**
 * Water Conditions Widget
 * Perfect Paddles Edition
 * Version 1.0.0
 */

(function() {
    'use strict';
    
    // Widget configuration
    const WIDGET_CONFIG = {
        apiEndpoint: 'https://your-domain.com/api/widget.php',
        refreshInterval: 600000, // 10 minutes in milliseconds
        colors: {
            beginner: '#28a745',
            intermediate: '#ffc107',
            advanced: '#dc3545'
        },
        brandColor: '#0099cc',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
    };
    
    /**
     * Create widget HTML structure
     */
    function createWidgetHTML() {
        return `
            <div class="pp-widget-container">
                <div class="pp-widget-header">
                    <img src="https://perfectpaddles.com/wp-content/uploads/2021/03/PP_Logo_Horizontal_Blue.png" 
                         alt="Perfect Paddles" 
                         class="pp-widget-logo">
                </div>
                <div class="pp-widget-body">
                    <div class="pp-condition-indicator">
                        <div class="pp-condition-circle"></div>
                    </div>
                    <div class="pp-condition-content">
                        <h3 class="pp-location-name">Loading...</h3>
                        <p class="pp-condition-message">Fetching current conditions...</p>
                        <div class="pp-weather-details"></div>
                    </div>
                </div>
                <div class="pp-widget-footer">
                    <span class="pp-last-updated">Last updated: --</span>
                </div>
            </div>
        `;
    }
    
    /**
     * Create widget CSS
     */
    function createWidgetCSS() {
        return `
            .pp-widget-container {
                font-family: ${WIDGET_CONFIG.fontFamily};
                max-width: 400px;
                background: linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%);
                border-radius: 12px;
                box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1), 0 1px 3px rgba(0, 0, 0, 0.08);
                overflow: hidden;
                border: 2px solid ${WIDGET_CONFIG.brandColor};
            }
            
            .pp-widget-header {
                background: ${WIDGET_CONFIG.brandColor};
                padding: 12px 16px;
                text-align: center;
            }
            
            .pp-widget-logo {
                max-height: 40px;
                width: auto;
            }
            
            .pp-widget-body {
                padding: 20px;
                display: flex;
                align-items: center;
                gap: 16px;
            }
            
            .pp-condition-indicator {
                flex-shrink: 0;
            }
            
            .pp-condition-circle {
                width: 80px;
                height: 80px;
                border-radius: 50%;
                background: #e0e0e0;
                display: flex;
                align-items: center;
                justify-content: center;
                font-weight: bold;
                font-size: 14px;
                color: white;
                box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
                transition: all 0.3s ease;
            }
            
            .pp-condition-content {
                flex: 1;
            }
            
            .pp-location-name {
                margin: 0 0 8px 0;
                font-size: 18px;
                font-weight: 600;
                color: #333;
            }
            
            .pp-condition-message {
                margin: 0 0 12px 0;
                font-size: 14px;
                color: #555;
                line-height: 1.4;
            }
            
            .pp-weather-details {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 8px;
                font-size: 12px;
                color: #666;
            }
            
            .pp-weather-detail {
                display: flex;
                align-items: center;
                gap: 4px;
            }
            
            .pp-weather-detail-icon {
                font-size: 16px;
            }
            
            .pp-widget-footer {
                background: #f1f3f5;
                padding: 8px 16px;
                text-align: center;
                font-size: 11px;
                color: #666;
                border-top: 1px solid #e0e0e0;
            }
            
            .pp-widget-error {
                background: #fff3cd;
                border: 1px solid #ffc107;
                padding: 12px;
                border-radius: 4px;
                margin: 12px 16px;
                font-size: 13px;
                color: #856404;
            }
            
            @keyframes pp-pulse {
                0% { opacity: 0.6; }
                50% { opacity: 1; }
                100% { opacity: 0.6; }
            }
            
            .pp-loading {
                animation: pp-pulse 1.5s ease-in-out infinite;
            }
        `;
    }
    
    /**
     * Format timestamp for display
     */
    function formatTimestamp(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const diffMinutes = Math.floor((now - date) / 60000);
        
        if (diffMinutes < 1) return 'Just now';
        if (diffMinutes === 1) return '1 minute ago';
        if (diffMinutes < 60) return `${diffMinutes} minutes ago`;
        
        const hours = date.getHours();
        const minutes = date.getMinutes();
        const ampm = hours >= 12 ? 'PM' : 'AM';
        const displayHours = hours % 12 || 12;
        const displayMinutes = minutes < 10 ? '0' + minutes : minutes;
        
        return `${displayHours}:${displayMinutes} ${ampm}`;
    }
    
    /**
     * Fetch weather data from API
     */
    async function fetchWeatherData(apiKey, locationId) {
        const url = `${WIDGET_CONFIG.apiEndpoint}?api_key=${encodeURIComponent(apiKey)}&location_id=${encodeURIComponent(locationId)}`;
        
        try {
            const response = await fetch(url);
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.error || 'Failed to fetch weather data');
            }
            
            return data;
        } catch (error) {
            console.error('Water Conditions Widget Error:', error);
            throw error;
        }
    }
    
    /**
     * Update widget with weather data
     */
    function updateWidget(container, data) {
        const circle = container.querySelector('.pp-condition-circle');
        const locationName = container.querySelector('.pp-location-name');
        const message = container.querySelector('.pp-condition-message');
        const detailsContainer = container.querySelector('.pp-weather-details');
        const lastUpdated = container.querySelector('.pp-last-updated');
        
        // Update condition indicator
        const level = data.conditions.level;
        const color = WIDGET_CONFIG.colors[level];
        circle.style.background = color;
        circle.textContent = level.toUpperCase();
        
        // Update location
        const location = data.location;
        locationName.textContent = `${location.name}${location.body_of_water ? ', ' + location.body_of_water : ''}`;
        
        // Update message
        message.textContent = data.conditions.message;
        
        // Update weather details
        const weather = data.weather;
        detailsContainer.innerHTML = `
            <div class="pp-weather-detail">
                <span class="pp-weather-detail-icon">🌬️</span>
                <span>${weather.wind_speed} mph wind</span>
            </div>
            <div class="pp-weather-detail">
                <span class="pp-weather-detail-icon">🌊</span>
                <span>${weather.wave_height}ft waves</span>
            </div>
            <div class="pp-weather-detail">
                <span class="pp-weather-detail-icon">🌡️</span>
                <span>${weather.air_temp}°F air</span>
            </div>
            <div class="pp-weather-detail">
                <span class="pp-weather-detail-icon">💧</span>
                <span>${weather.water_temp}°F water</span>
            </div>
        `;
        
        // Update timestamp
        lastUpdated.textContent = `Last updated: ${formatTimestamp(data.last_updated)}`;
        
        // Remove loading state
        container.classList.remove('pp-loading');
    }
    
    /**
     * Show error in widget
     */
    function showError(container, message) {
        const body = container.querySelector('.pp-widget-body');
        body.innerHTML = `<div class="pp-widget-error">${message}</div>`;
        container.classList.remove('pp-loading');
    }
    
    /**
     * Initialize widget
     */
    async function initWidget(element, apiKey, locationId) {
        // Inject CSS if not already present
        if (!document.getElementById('pp-widget-styles')) {
            const style = document.createElement('style');
            style.id = 'pp-widget-styles';
            style.textContent = createWidgetCSS();
            document.head.appendChild(style);
        }
        
        // Create widget HTML
        element.innerHTML = createWidgetHTML();
        const container = element.querySelector('.pp-widget-container');
        container.classList.add('pp-loading');
        
        // Fetch and display data
        try {
            const data = await fetchWeatherData(apiKey, locationId);
            updateWidget(container, data);
            
            // Set up auto-refresh
            setInterval(async () => {
                try {
                    const data = await fetchWeatherData(apiKey, locationId);
                    updateWidget(container, data);
                } catch (error) {
                    console.error('Widget refresh failed:', error);
                }
            }, WIDGET_CONFIG.refreshInterval);
            
        } catch (error) {
            showError(container, 'Unable to load water conditions. Please try again later.');
        }
    }
    
    /**
     * Public API
     */
    window.PerfectPaddlesWidget = {
        init: function(elementId, apiKey, locationId) {
            const element = document.getElementById(elementId);
            if (!element) {
                console.error('Perfect Paddles Widget: Element not found:', elementId);
                return;
            }
            
            if (!apiKey || !locationId) {
                console.error('Perfect Paddles Widget: API key and location ID are required');
                return;
            }
            
            initWidget(element, apiKey, locationId);
        },
        
        version: '1.0.0'
    };
    
    // Auto-initialize widgets with data attributes
    document.addEventListener('DOMContentLoaded', function() {
        const widgets = document.querySelectorAll('[data-pp-widget]');
        widgets.forEach(function(element) {
            const apiKey = element.getAttribute('data-api-key');
            const locationId = element.getAttribute('data-location-id');
            
            if (apiKey && locationId) {
                initWidget(element, apiKey, locationId);
            }
        });
    });
    
})();
