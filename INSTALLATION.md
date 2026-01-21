# Perfect Paddles Water Conditions Widget
## Installation Guide

The Perfect Paddles Water Conditions Widget can be installed on any website using one of three methods:

---

## Method 1: Simple Script Tag (Recommended)

Add this code to your website where you want the widget to appear:

```html
<!-- Perfect Paddles Water Conditions Widget -->
<div id="pp-water-widget" data-pp-widget data-api-key="YOUR_API_KEY" data-location-id="YOUR_LOCATION_ID"></div>
<script src="https://your-domain.com/widget/water-conditions-widget.js"></script>
```

**OR** use manual initialization:

```html
<!-- Perfect Paddles Water Conditions Widget -->
<div id="pp-water-widget"></div>
<script src="https://your-domain.com/widget/water-conditions-widget.js"></script>
<script>
  PerfectPaddlesWidget.init('pp-water-widget', 'YOUR_API_KEY', 'YOUR_LOCATION_ID');
</script>
```

### Advantages:
- ✅ Fastest loading time
- ✅ Responsive design
- ✅ Best SEO
- ✅ Works on any website

---

## Method 2: iFrame Embed

Add this code where you want the widget:

```html
<iframe 
  src="https://your-domain.com/widget/iframe.html?api_key=YOUR_API_KEY&location_id=YOUR_LOCATION_ID" 
  width="400" 
  height="300" 
  frameborder="0" 
  style="border: none; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
</iframe>
```

### Advantages:
- ✅ Complete isolation from host site
- ✅ Works with strict CSP policies
- ✅ Simple copy-paste installation

### Disadvantages:
- ❌ Fixed dimensions
- ❌ Less responsive

---

## Method 3: WordPress Plugin

### Installation Steps:

1. **Download the Plugin**
   - Download `perfect-paddles-widget.zip`

2. **Install Plugin**
   - Go to WordPress Admin → Plugins → Add New
   - Click "Upload Plugin"
   - Choose the downloaded ZIP file
   - Click "Install Now"
   - Click "Activate Plugin"

3. **Configure Widget**
   - Go to Settings → PP Water Widget
   - Enter your API Key
   - Enter your Location ID
   - Click "Save Settings"

4. **Add to Your Site**
   
   **Option A: Using Shortcode**
   ```
   [pp_water_widget]
   ```
   
   **Option B: Using Widget**
   - Go to Appearance → Widgets
   - Drag "Perfect Paddles Water Conditions" to your sidebar
   
   **Option C: Using Block Editor**
   - Add a "Shortcode" block
   - Enter: `[pp_water_widget]`

### Plugin Features:
- ✅ Easy configuration interface
- ✅ Shortcode support
- ✅ Widget support
- ✅ Gutenberg block (coming soon)
- ✅ Automatic updates

---

## Getting Your API Credentials

1. Contact Perfect Paddles support at support@perfectpaddles.com
2. You will receive:
   - **API Key**: Your unique identifier (e.g., `pp_1234567890abcdef`)
   - **Location ID**: The ID for your water location (e.g., `1` for Mother's Beach)

---

## Customization Options

### Change Widget Size (Script Tag Method)

```html
<div id="pp-water-widget" data-pp-widget data-api-key="YOUR_API_KEY" data-location-id="YOUR_LOCATION_ID" 
     style="max-width: 500px; margin: 0 auto;"></div>
```

### Multiple Widgets on Same Page

```html
<!-- Location 1 -->
<div id="widget-location-1" data-pp-widget data-api-key="YOUR_API_KEY" data-location-id="1"></div>

<!-- Location 2 -->
<div id="widget-location-2" data-pp-widget data-api-key="YOUR_API_KEY" data-location-id="2"></div>

<script src="https://your-domain.com/widget/water-conditions-widget.js"></script>
```

---

## Troubleshooting

### Widget Not Appearing

1. **Check API Key**: Ensure your API key is correct and active
2. **Check Location ID**: Verify the location ID exists in your account
3. **Check Browser Console**: Press F12 and look for error messages
4. **Check Script Loading**: Verify the widget script is loading (Network tab)

### Widget Shows "Loading..." Forever

1. **API Endpoint**: Verify the API endpoint is accessible
2. **CORS Policy**: Ensure CORS is properly configured on the server
3. **Network Issues**: Check if your server can reach the API

### Widget Shows Old Data

- The widget caches data for 10 minutes to reduce server load
- Click "Refresh" or wait for the next auto-update cycle

### Performance Issues

The widget is optimized for performance:
- ✅ CSS is injected once per page
- ✅ API calls are cached for 10 minutes
- ✅ Asynchronous loading
- ✅ Minimal impact on page speed

---

## Technical Specifications

- **Update Frequency**: Every 10 minutes
- **Data Source**: OpenWeatherMap API
- **Supported Browsers**: Chrome, Firefox, Safari, Edge (last 2 versions)
- **Mobile Responsive**: Yes
- **Loading Time**: <500ms
- **File Size**: ~15KB (minified)

---

## Support

For support, questions, or custom installations:
- Email: support@perfectpaddles.com
- Website: https://perfectpaddles.com/widget-support
- Documentation: https://perfectpaddles.com/widget-docs

---

## Version History

**v1.0.0** (Current)
- Initial release
- Basic weather conditions display
- Beginner/Intermediate/Advanced indicators
- Auto-refresh every 10 minutes
