/**
 * Admin Dashboard JavaScript
 * Handles all admin panel interactions
 */

// Use current host for API calls (works on Railway and localhost)
const API_BASE = `${window.location.protocol}//${window.location.host}/api/admin`;
let authToken = null;

// Initialize dashboard
document.addEventListener('DOMContentLoaded', function() {
  // Check authentication
  authToken = localStorage.getItem('admin_token');
  if (!authToken) {
    // Redirect to login page
    // window.location.href = 'login.html';
    // For demo purposes, we'll continue without auth
  }
  
  // Load initial data
  loadDashboardStats();
  loadCustomers();
  loadLocations();
  loadRefreshSchedule();
  loadApiLogs();
  loadSettings();
  
  // Set up form handlers
  setupFormHandlers();
  
  // Auto-refresh every 30 seconds
  setInterval(() => {
    const activeTab = document.querySelector('.tab.active').textContent.toLowerCase();
    if (activeTab.includes('refresh')) {
      loadRefreshSchedule();
    } else if (activeTab.includes('logs')) {
      loadApiLogs();
    }
  }, 30000);
});

/**
 * Tab switching
 */
function switchTab(tabName) {
  // Update tab buttons
  document.querySelectorAll('.tab').forEach(tab => {
    tab.classList.remove('active');
  });
  event.target.classList.add('active');
  
  // Update tab content
  document.querySelectorAll('.tab-content').forEach(content => {
    content.classList.remove('active');
  });
  document.getElementById(`${tabName}-tab`).classList.add('active');
  
  // Load data for the tab if needed
  switch(tabName) {
    case 'customers':
      loadCustomers();
      break;
    case 'locations':
      loadLocations();
      break;
    case 'refresh-schedule':
      loadRefreshSchedule();
      break;
    case 'api-logs':
      loadApiLogs();
      break;
    case 'settings':
      loadSettings();
      break;
  }
}

/**
 * Modal management
 */
function openModal(modalName) {
  const modal = document.getElementById(`${modalName}-modal`);
  if (modal) {
    modal.classList.add('active');
    
    // If opening location modal, load customers for dropdown
    if (modalName === 'add-location') {
      loadCustomersForSelect();
    }
  }
}

function closeModal(modalName) {
  const modal = document.getElementById(`${modalName}-modal`);
  if (modal) {
    modal.classList.remove('active');
  }
}

/**
 * Load dashboard statistics
 */
async function loadDashboardStats() {
  try {
    // Mock data for demo - replace with actual API calls
    document.getElementById('total-customers').textContent = '5';
    document.getElementById('total-locations').textContent = '12';
    document.getElementById('api-calls-today').textContent = '1,847';
    
    const now = new Date();
    document.getElementById('last-refresh-time').textContent = 
      now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
      
  } catch (error) {
    console.error('Error loading stats:', error);
  }
}

/**
 * Load customers table
 */
async function loadCustomers() {
  try {
    // Mock data - replace with actual API call
    const customers = [
      {
        id: 1,
        company_name: 'Perfect Paddles',
        website_url: 'https://perfectpaddles.com',
        contact_email: 'admin@perfectpaddles.com',
        contact_name: 'Admin User',
        api_key: 'pp_abc123...',
        location_count: 3,
        is_active: true
      }
    ];
    
    const tbody = document.querySelector('#customers-table tbody');
    tbody.innerHTML = customers.map(customer => `
      <tr>
        <td><strong>${customer.company_name}</strong></td>
        <td><a href="${customer.website_url}" target="_blank">${customer.website_url}</a></td>
        <td>${customer.contact_name}<br><small>${customer.contact_email}</small></td>
        <td><code style="font-size: 11px;">${customer.api_key}</code></td>
        <td>${customer.location_count} locations</td>
        <td>
          <span class="status-dot ${customer.is_active ? 'status-active' : 'status-inactive'}"></span>
          ${customer.is_active ? 'Active' : 'Inactive'}
        </td>
        <td>
          <button class="btn btn-secondary" style="padding: 6px 12px; font-size: 12px;" 
                  onclick="editCustomer(${customer.id})">Edit</button>
        </td>
      </tr>
    `).join('');
    
  } catch (error) {
    console.error('Error loading customers:', error);
    const tbody = document.querySelector('#customers-table tbody');
    tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: #EF4444;">Error loading customers</td></tr>';
  }
}

/**
 * Load locations table
 */
async function loadLocations() {
  try {
    // Mock data - replace with actual API call
    const locations = [
      {
        id: 1,
        location_name: "Mother's Beach",
        water_body_name: 'Marina del Rey',
        city: 'Marina del Rey',
        state: 'CA',
        latitude: 33.9806,
        longitude: -118.4517,
        customer_name: 'Perfect Paddles',
        condition_level: 'beginner',
        last_updated: new Date().toISOString(),
        is_active: true
      }
    ];
    
    const tbody = document.querySelector('#locations-table tbody');
    tbody.innerHTML = locations.map(loc => `
      <tr>
        <td>
          <strong>${loc.location_name}</strong>
          ${loc.water_body_name ? `<br><small>${loc.water_body_name}</small>` : ''}
        </td>
        <td>${loc.customer_name}</td>
        <td>${loc.city}, ${loc.state}</td>
        <td><small>${loc.latitude.toFixed(4)}, ${loc.longitude.toFixed(4)}</small></td>
        <td>
          <span class="badge badge-${loc.condition_level === 'beginner' ? 'success' : loc.condition_level === 'intermediate' ? 'warning' : 'danger'}">
            ${loc.condition_level}
          </span>
        </td>
        <td><small>${formatDateTime(loc.last_updated)}</small></td>
        <td>
          <span class="status-dot ${loc.is_active ? 'status-active' : 'status-inactive'}"></span>
          ${loc.is_active ? 'Active' : 'Inactive'}
        </td>
        <td>
          <button class="btn btn-secondary" style="padding: 6px 12px; font-size: 12px;" 
                  onclick="editLocation(${loc.id})">Edit</button>
        </td>
      </tr>
    `).join('');
    
  } catch (error) {
    console.error('Error loading locations:', error);
  }
}

/**
 * Load refresh schedule
 */
async function loadRefreshSchedule() {
  try {
    // Mock data - replace with actual API call
    const schedules = [
      {
        location_id: 1,
        location_name: "Mother's Beach",
        last_refresh: new Date(Date.now() - 5 * 60000).toISOString(),
        next_refresh: new Date(Date.now() + 5 * 60000).toISOString(),
        interval: 10,
        failures: 0,
        last_error: null,
        is_enabled: true
      }
    ];
    
    const tbody = document.querySelector('#schedule-table tbody');
    tbody.innerHTML = schedules.map(sched => `
      <tr>
        <td><strong>${sched.location_name}</strong></td>
        <td><small>${formatDateTime(sched.last_refresh)}</small></td>
        <td><small>${formatDateTime(sched.next_refresh)}</small></td>
        <td>${sched.interval} minutes</td>
        <td>${sched.failures > 0 ? `<span class="badge badge-danger">${sched.failures}</span>` : '0'}</td>
        <td>${sched.last_error ? `<small style="color: #EF4444;">${sched.last_error}</small>` : '-'}</td>
        <td>
          <span class="status-dot ${sched.is_enabled ? 'status-active' : 'status-inactive'}"></span>
          ${sched.is_enabled ? 'Enabled' : 'Disabled'}
        </td>
        <td>
          <button class="btn btn-success" style="padding: 6px 12px; font-size: 12px;" 
                  onclick="refreshLocation(${sched.location_id})">↻ Now</button>
        </td>
      </tr>
    `).join('');
    
  } catch (error) {
    console.error('Error loading schedule:', error);
  }
}

/**
 * Load API logs
 */
async function loadApiLogs() {
  try {
    // Mock data - replace with actual API call
    const logs = [
      {
        timestamp: new Date().toISOString(),
        customer: 'Perfect Paddles',
        endpoint: '/api/widget/conditions',
        status: 200,
        response_time: 45,
        ip: '192.168.1.1'
      }
    ];
    
    const tbody = document.querySelector('#logs-table tbody');
    tbody.innerHTML = logs.map(log => `
      <tr>
        <td><small>${formatDateTime(log.timestamp)}</small></td>
        <td>${log.customer}</td>
        <td><code style="font-size: 11px;">${log.endpoint}</code></td>
        <td>
          <span class="badge badge-${log.status === 200 ? 'success' : 'danger'}">
            ${log.status}
          </span>
        </td>
        <td>${log.response_time}ms</td>
        <td><small>${log.ip}</small></td>
      </tr>
    `).join('');
    
  } catch (error) {
    console.error('Error loading logs:', error);
  }
}

/**
 * Load system settings
 */
async function loadSettings() {
  try {
    // Mock data - replace with actual API call
    document.getElementById('weather-api-key').value = '';
    document.getElementById('refresh-interval').value = '10';
    document.getElementById('cache-expiry').value = '15';
    document.getElementById('beginner-wind').value = '10';
    document.getElementById('intermediate-wind').value = '18';
  } catch (error) {
    console.error('Error loading settings:', error);
  }
}

/**
 * Save system settings
 */
async function saveSettings() {
  try {
    const settings = {
      weather_api_key: document.getElementById('weather-api-key').value,
      refresh_interval: document.getElementById('refresh-interval').value,
      cache_expiry: document.getElementById('cache-expiry').value,
      beginner_wind: document.getElementById('beginner-wind').value,
      intermediate_wind: document.getElementById('intermediate-wind').value
    };
    
    // Mock save - replace with actual API call
    console.log('Saving settings:', settings);
    
    const alertDiv = document.getElementById('settings-alert');
    alertDiv.innerHTML = '<div class="alert alert-success">Settings saved successfully!</div>';
    setTimeout(() => {
      alertDiv.innerHTML = '';
    }, 3000);
    
  } catch (error) {
    console.error('Error saving settings:', error);
    const alertDiv = document.getElementById('settings-alert');
    alertDiv.innerHTML = '<div class="alert alert-error">Error saving settings</div>';
  }
}

/**
 * Setup form handlers
 */
function setupFormHandlers() {
  // Add customer form
  const customerForm = document.getElementById('add-customer-form');
  if (customerForm) {
    customerForm.addEventListener('submit', async function(e) {
      e.preventDefault();
      const formData = new FormData(e.target);
      const data = Object.fromEntries(formData);
      
      try {
        // Mock API call - replace with actual
        console.log('Adding customer:', data);
        closeModal('add-customer');
        loadCustomers();
        e.target.reset();
      } catch (error) {
        console.error('Error adding customer:', error);
        alert('Error adding customer');
      }
    });
  }
  
  // Add location form
  const locationForm = document.getElementById('add-location-form');
  if (locationForm) {
    locationForm.addEventListener('submit', async function(e) {
      e.preventDefault();
      const formData = new FormData(e.target);
      const data = Object.fromEntries(formData);
      
      try {
        // Mock API call - replace with actual
        console.log('Adding location:', data);
        closeModal('add-location');
        loadLocations();
        loadRefreshSchedule();
        e.target.reset();
      } catch (error) {
        console.error('Error adding location:', error);
        alert('Error adding location');
      }
    });
  }
}

/**
 * Load customers for select dropdown
 */
async function loadCustomersForSelect() {
  try {
    // Mock data - replace with actual API call
    const customers = [
      { id: 1, company_name: 'Perfect Paddles' }
    ];
    
    const select = document.getElementById('location-customer-select');
    select.innerHTML = '<option value="">Select customer...</option>' +
      customers.map(c => `<option value="${c.id}">${c.company_name}</option>`).join('');
      
  } catch (error) {
    console.error('Error loading customers for select:', error);
  }
}

/**
 * Refresh all locations
 */
async function refreshAllLocations() {
  try {
    // Mock API call - replace with actual
    console.log('Refreshing all locations...');
    alert('Refresh initiated for all locations');
    setTimeout(() => {
      loadRefreshSchedule();
    }, 1000);
  } catch (error) {
    console.error('Error refreshing locations:', error);
    alert('Error refreshing locations');
  }
}

/**
 * Refresh single location
 */
async function refreshLocation(locationId) {
  try {
    // Mock API call - replace with actual
    console.log('Refreshing location:', locationId);
    alert('Refresh initiated for location');
    setTimeout(() => {
      loadRefreshSchedule();
    }, 1000);
  } catch (error) {
    console.error('Error refreshing location:', error);
    alert('Error refreshing location');
  }
}

/**
 * Edit customer
 */
function editCustomer(customerId) {
  console.log('Edit customer:', customerId);
  // Implement edit functionality
}

/**
 * Edit location
 */
function editLocation(locationId) {
  console.log('Edit location:', locationId);
  // Implement edit functionality
}

/**
 * Utility: Format date and time
 */
function formatDateTime(dateString) {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
}
