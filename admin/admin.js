/**
 * Simple Admin Dashboard - Working Version
 */

const API_BASE = `${window.location.protocol}//${window.location.host}/api/admin`;
let authToken = localStorage.getItem('admin_token');

// Check authentication on load
document.addEventListener('DOMContentLoaded', function() {
  // Verify session
  if (!authToken) {
    window.location.href = '/admin/login.html';
    return;
  }
  
  fetch(`${API_BASE}/verify`, {
    headers: { 'Authorization': `Bearer ${authToken}` }
  })
  .then(r => r.json())
  .then(data => {
    if (!data.valid) {
      localStorage.removeItem('admin_token');
      localStorage.removeItem('admin_user');
      window.location.href = '/admin/login.html';
    } else {
      // Load dashboard
      console.log('Admin Dashboard loaded, API_BASE:', API_BASE);
      loadDashboardStats();
      loadCustomers();
      setupFormHandlers();
    }
  })
  .catch(() => {
    window.location.href = '/admin/login.html';
  });
});

function switchTab(tabName) {
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  event.target.classList.add('active');
  document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
  document.getElementById(`${tabName}-tab`).classList.add('active');
  
  if (tabName === 'customers') loadCustomers();
  else if (tabName === 'locations') loadLocations();
  else if (tabName === 'weather-data') loadWeatherData();
  else if (tabName === 'api-logs') loadApiLogs();
  else if (tabName === 'refresh-schedule') loadRefreshSchedule();
  else if (tabName === 'settings') loadSettings();
}

async function loadDashboardStats() {
  try {
    console.log('Fetching:', `${API_BASE}/stats`);
    const response = await fetch(`${API_BASE}/stats`);
    const data = await response.json();
    console.log('Stats:', data);
    
    document.getElementById('total-customers').textContent = data.totalCustomers || '0';
    document.getElementById('total-locations').textContent = data.totalLocations || '0';
    document.getElementById('api-calls-today').textContent = data.apiCallsLast24h || '0';
    
    const now = new Date();
    document.getElementById('last-refresh-time').textContent = now.toLocaleTimeString();
  } catch (error) {
    console.error('Error loading stats:', error);
  }
}

async function loadCustomers() {
  try {
    console.log('Fetching:', `${API_BASE}/customers`);
    const response = await fetch(`${API_BASE}/customers`);
    const customers = await response.json();
    console.log('Customers:', customers);
    
    const tbody = document.querySelector('#customers-table tbody');
    tbody.innerHTML = customers.map(c => `
      <tr>
        <td><strong>${c.company_name}</strong></td>
        <td>${c.website_url || 'N/A'}</td>
        <td>${c.contact_email || 'N/A'}</td>
        <td><code style="font-size: 10px;">${c.api_key}</code></td>
        <td>-</td>
        <td>${c.is_active ? '✅ Active' : '❌ Inactive'}</td>
        <td>
          <button class="btn btn-secondary" style="padding: 6px 12px; font-size: 12px;" onclick="editCustomer(${c.id})">
            ✏️ Edit
          </button>
        </td>
      </tr>
    `).join('');
  } catch (error) {
    console.error('Error loading customers:', error);
    document.querySelector('#customers-table tbody').innerHTML = 
      `<tr><td colspan="7">Error: ${error.message}</td></tr>`;
  }
}

async function loadLocations() {
  try {
    const response = await fetch(`${API_BASE}/locations`);
    const locations = await response.json();
    console.log('Locations:', locations);
    
    const tbody = document.querySelector('#locations-table tbody');
    tbody.innerHTML = locations.map(l => `
      <tr>
        <td><strong>${l.location_name}</strong><br><small>${l.water_body_name || ''}</small></td>
        <td>${l.company_name}</td>
        <td>${l.city}, ${l.state}</td>
        <td>${l.latitude}, ${l.longitude}</td>
        <td>
          ${l.condition_level ? `<span style="color: ${l.condition_level === 'beginner' ? '#10B981' : l.condition_level === 'intermediate' ? '#F59E0B' : '#EF4444'}">${l.condition_level}</span><br>` : ''}
          ${l.wind_speed_mph ? `${l.wind_speed_mph} mph, ${l.temperature_f}°F` : 'N/A'}
        </td>
        <td>${l.fetched_at ? new Date(l.fetched_at).toLocaleString() : 'Never'}</td>
        <td>${l.is_active ? '✅ Active' : '❌ Inactive'}</td>
        <td>
          <button class="btn btn-secondary" style="padding: 6px 12px; font-size: 12px;" onclick="editLocation(${l.id})">
            ✏️ Edit
          </button>
        </td>
      </tr>
    `).join('');
  } catch (error) {
    console.error('Error loading locations:', error);
  }
}

async function loadWeatherData() {
  try {
    console.log('Fetching:', `${API_BASE}/weather-data`);
    const response = await fetch(`${API_BASE}/weather-data`);
    const data = await response.json();
    console.log('Weather Data:', data);
    
    const tbody = document.querySelector('#weather-data-table tbody');
    tbody.innerHTML = data.map(w => `
      <tr>
        <td><strong>${w.location_name}</strong><br><small>${w.water_body_name || ''}</small></td>
        <td>
          <span style="padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: 600; 
                 background: ${w.condition_level === 'beginner' ? '#D1FAE5' : w.condition_level === 'intermediate' ? '#FEF3C7' : '#FEE2E2'};
                 color: ${w.condition_level === 'beginner' ? '#065F46' : w.condition_level === 'intermediate' ? '#92400E' : '#991B1B'};">
            ${w.condition_level ? w.condition_level.toUpperCase() : 'N/A'}
          </span>
        </td>
        <td>${w.temperature_f ? w.temperature_f + '°F' : 'N/A'}</td>
        <td>${w.wind_speed_mph ? w.wind_speed_mph + ' mph' : 'N/A'}</td>
        <td>${w.wind_direction || 'N/A'}</td>
        <td>${w.weather_condition || 'N/A'}</td>
        <td>${w.cloud_cover != null ? w.cloud_cover + '%' : 'N/A'}</td>
        <td>${w.humidity != null ? w.humidity + '%' : 'N/A'}</td>
        <td>${w.fetched_at ? new Date(w.fetched_at).toLocaleString() : 'Never'}</td>
      </tr>
    `).join('');
  } catch (error) {
    console.error('Error loading weather data:', error);
    document.querySelector('#weather-data-table tbody').innerHTML = 
      `<tr><td colspan="9">Error: ${error.message}</td></tr>`;
  }
}

async function refreshAllNow() {
  if (!confirm('This will immediately pull fresh weather data from WeatherAPI.com for all locations. Continue?')) {
    return;
  }
  
  const button = event.target;
  button.disabled = true;
  button.textContent = '🔄 Refreshing...';
  
  try {
    console.log('Triggering manual refresh...');
    const response = await fetch(`${API_BASE}/refresh-all-now`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });
    
    const result = await response.json();
    
    if (response.ok && result.success) {
      alert(`✅ ${result.message}\n\nSuccessful: ${result.successful}\nFailed: ${result.failed}`);
      // Reload weather data table
      loadWeatherData();
    } else {
      alert('Error: ' + (result.error || 'Failed to refresh'));
    }
  } catch (error) {
    console.error('Error refreshing:', error);
    alert('Network error. Please try again.');
  } finally {
    button.disabled = false;
    button.textContent = '🔄 Refresh All Now';
  }
}

async function loadApiLogs() {
  try {
    const response = await fetch(`${API_BASE}/logs`);
    const logs = await response.json();
    console.log('Logs:', logs);
    
    const tbody = document.querySelector('#logs-table tbody');
    tbody.innerHTML = logs.map(log => `
      <tr>
        <td>${new Date(log.created_at).toLocaleString()}</td>
        <td>${log.endpoint}</td>
        <td>${log.company_name || 'N/A'}</td>
        <td>${log.status_code}</td>
        <td>${log.response_time_ms}ms</td>
        <td>${log.ip_address}</td>
      </tr>
    `).join('');
  } catch (error) {
    console.error('Error loading logs:', error);
  }
}

async function loadRefreshSchedule() {
  try {
    const response = await fetch(`${API_BASE}/refresh-schedule`);
    const schedule = await response.json();
    console.log('Schedule:', schedule);
    
    const tbody = document.querySelector('#schedule-table tbody');
    tbody.innerHTML = schedule.map(s => `
      <tr>
        <td>${s.location_name}</td>
        <td>${s.company_name}</td>
        <td>${new Date(s.last_refresh_at).toLocaleString()}</td>
        <td>${new Date(s.next_refresh_at).toLocaleString()}</td>
        <td>${s.consecutive_failures || 0}</td>
      </tr>
    `).join('');
  } catch (error) {
    console.error('Error loading schedule:', error);
  }
}

async function loadSettings() {
  try {
    const response = await fetch(`${API_BASE}/settings`);
    const settings = await response.json();
    console.log('Settings:', settings);
    
    // Populate form fields
    if (settings.beginner_wind_max_mph) {
      document.getElementById('beginner-wind').value = settings.beginner_wind_max_mph;
    }
    if (settings.intermediate_wind_max_mph) {
      document.getElementById('intermediate-wind').value = settings.intermediate_wind_max_mph;
    }
    if (settings.weather_api_key) {
      document.getElementById('weather-api-key').value = settings.weather_api_key;
    }
    if (settings.refresh_interval_minutes) {
      document.getElementById('refresh-interval').value = settings.refresh_interval_minutes;
    }
    if (settings.cache_expiry_minutes) {
      document.getElementById('cache-expiry').value = settings.cache_expiry_minutes;
    }
  } catch (error) {
    console.error('Error loading settings:', error);
  }
}

// Modal management
function openModal(modalId) {
  const modal = document.getElementById(`${modalId}-modal`);
  if (modal) {
    modal.classList.add('active');
    
    // Load customers for location dropdown
    if (modalId === 'add-location') {
      loadCustomersForSelect();
    }
  }
}

function closeModal(modalId) {
  const modal = document.getElementById(`${modalId}-modal`);
  if (modal) {
    modal.classList.remove('active');
  }
}

// Form handlers
function setupFormHandlers() {
  // Add Customer Form
  const customerForm = document.getElementById('add-customer-form');
  if (customerForm) {
    customerForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const formData = new FormData(customerForm);
      const data = Object.fromEntries(formData);
      
      try {
        const response = await fetch(`${API_BASE}/customers`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`
          },
          body: JSON.stringify(data)
        });
        
        const result = await response.json();
        
        if (response.ok && result.success) {
          alert(`Customer added successfully!\n\nAPI Key: ${result.api_key}\n\nPlease save this key - it won't be shown again.`);
          closeModal('add-customer');
          customerForm.reset();
          loadCustomers();
        } else {
          alert('Error: ' + (result.error || 'Failed to add customer'));
        }
      } catch (error) {
        console.error('Error adding customer:', error);
        alert('Network error. Please try again.');
      }
    });
  }
  
  // Edit Customer Form
  const editCustomerForm = document.getElementById('edit-customer-form');
  if (editCustomerForm) {
    editCustomerForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const customerId = document.getElementById('edit-customer-id').value;
      const data = {
        company_name: document.getElementById('edit-company-name').value,
        website_url: document.getElementById('edit-website-url').value,
        contact_email: document.getElementById('edit-contact-email').value,
        contact_name: document.getElementById('edit-contact-name').value,
        is_active: document.getElementById('edit-is-active').checked
      };
      
      try {
        const response = await fetch(`${API_BASE}/customers/${customerId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`
          },
          body: JSON.stringify(data)
        });
        
        const result = await response.json();
        
        if (response.ok && result.success) {
          alert('Customer updated successfully!');
          closeModal('edit-customer');
          loadCustomers();
        } else {
          alert('Error: ' + (result.error || 'Failed to update customer'));
        }
      } catch (error) {
        console.error('Error updating customer:', error);
        alert('Network error. Please try again.');
      }
    });
  }
  
  // Add Location Form
  const locationForm = document.getElementById('add-location-form');
  if (locationForm) {
    locationForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const formData = new FormData(locationForm);
      const data = Object.fromEntries(formData);
      
      try {
        const response = await fetch(`${API_BASE}/locations`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`
          },
          body: JSON.stringify(data)
        });
        
        const result = await response.json();
        
        if (response.ok && result.success) {
          alert('Location added successfully!');
          closeModal('add-location');
          locationForm.reset();
          loadLocations();
        } else {
          alert('Error: ' + (result.error || 'Failed to add location'));
        }
      } catch (error) {
        console.error('Error adding location:', error);
        alert('Network error. Please try again.');
      }
    });
  }
  
  // Edit Location Form
  const editLocationForm = document.getElementById('edit-location-form');
  if (editLocationForm) {
    editLocationForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const locationId = document.getElementById('edit-location-id').value;
      const data = {
        customer_id: document.getElementById('edit-location-customer').value,
        location_name: document.getElementById('edit-location-name').value,
        water_body_name: document.getElementById('edit-water-body-name').value,
        city: document.getElementById('edit-location-city').value,
        state: document.getElementById('edit-location-state').value,
        zip_code: document.getElementById('edit-location-zip').value,
        latitude: document.getElementById('edit-location-latitude').value,
        longitude: document.getElementById('edit-location-longitude').value,
        timezone: document.getElementById('edit-location-timezone').value,
        is_active: document.getElementById('edit-location-active').checked
      };
      
      try {
        const response = await fetch(`${API_BASE}/locations/${locationId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`
          },
          body: JSON.stringify(data)
        });
        
        const result = await response.json();
        
        if (response.ok && result.success) {
          alert('Location updated successfully!');
          closeModal('edit-location');
          loadLocations();
        } else {
          alert('Error: ' + (result.error || 'Failed to update location'));
        }
      } catch (error) {
        console.error('Error updating location:', error);
        alert('Network error. Please try again.');
      }
    });
  }
  
  // Settings Form
  const settingsForm = document.getElementById('settings-form');
  if (settingsForm) {
    settingsForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      saveSettings();
    });
  }
  
  // Change Password Form
  const changePasswordForm = document.getElementById('change-password-form');
  if (changePasswordForm) {
    changePasswordForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const currentPassword = document.getElementById('current-password').value;
      const newPassword = document.getElementById('new-password').value;
      const confirmPassword = document.getElementById('confirm-password').value;
      
      // Client-side validation
      if (newPassword !== confirmPassword) {
        showPasswordAlert('New passwords do not match', 'error');
        return;
      }
      
      if (newPassword.length < 8) {
        showPasswordAlert('Password must be at least 8 characters', 'error');
        return;
      }
      
      if (newPassword === currentPassword) {
        showPasswordAlert('New password must be different from current password', 'error');
        return;
      }
      
      try {
        const response = await fetch(`${API_BASE}/change-password`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`
          },
          body: JSON.stringify({
            current_password: currentPassword,
            new_password: newPassword,
            confirm_password: confirmPassword
          })
        });
        
        const result = await response.json();
        
        if (response.ok && result.success) {
          showPasswordAlert(result.message, 'success');
          changePasswordForm.reset();
          setTimeout(() => {
            closeModal('change-password');
          }, 2000);
        } else {
          showPasswordAlert(result.error || 'Failed to change password', 'error');
        }
      } catch (error) {
        console.error('Error changing password:', error);
        showPasswordAlert('Network error. Please try again.', 'error');
      }
    });
  }
}

// Show alert in password modal
function showPasswordAlert(message, type = 'error') {
  const alert = document.getElementById('password-alert');
  alert.style.display = 'block';
  alert.style.padding = '12px';
  alert.style.borderRadius = '6px';
  alert.style.marginBottom = '15px';
  alert.textContent = message;
  
  if (type === 'error') {
    alert.style.background = '#FEE2E2';
    alert.style.color = '#991B1B';
    alert.style.border = '1px solid #FCA5A5';
  } else {
    alert.style.background = '#D1FAE5';
    alert.style.color = '#065F46';
    alert.style.border = '1px solid #6EE7B7';
  }
  
  if (type === 'success') {
    setTimeout(() => {
      alert.style.display = 'none';
    }, 3000);
  }
}

// Load customers for dropdown
async function loadCustomersForSelect() {
  try {
    const response = await fetch(`${API_BASE}/customers`);
    const customers = await response.json();
    
    const select = document.getElementById('location-customer-select');
    if (select) {
      select.innerHTML = '<option value="">Select customer...</option>' +
        customers.map(c => `<option value="${c.id}">${c.company_name}</option>`).join('');
    }
  } catch (error) {
    console.error('Error loading customers for select:', error);
  }
}

// Logout function
function logout() {
  if (confirm('Are you sure you want to logout?')) {
    fetch(`${API_BASE}/logout`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${authToken}` }
    })
    .finally(() => {
      localStorage.removeItem('admin_token');
      localStorage.removeItem('admin_user');
      window.location.href = '/admin/login.html';
    });
  }
}

// Edit customer function
async function editCustomer(customerId) {
  try {
    // Fetch customer details
    const response = await fetch(`${API_BASE}/customers`);
    const customers = await response.json();
    const customer = customers.find(c => c.id === customerId);
    
    if (!customer) {
      alert('Customer not found');
      return;
    }
    
    // Populate edit form
    document.getElementById('edit-customer-id').value = customer.id;
    document.getElementById('edit-company-name').value = customer.company_name;
    document.getElementById('edit-website-url').value = customer.website_url || '';
    document.getElementById('edit-contact-email').value = customer.contact_email || '';
    document.getElementById('edit-contact-name').value = customer.contact_name || '';
    document.getElementById('edit-is-active').checked = customer.is_active;
    
    // Show modal
    openModal('edit-customer');
  } catch (error) {
    console.error('Error loading customer:', error);
    alert('Failed to load customer details');
  }
}

// Edit location function
async function editLocation(locationId) {
  try {
    // Fetch location details
    const response = await fetch(`${API_BASE}/locations`);
    const locations = await response.json();
    const location = locations.find(l => l.id === locationId);
    
    if (!location) {
      alert('Location not found');
      return;
    }
    
    // Load customers for dropdown
    await loadCustomersForEditLocation();
    
    // Populate edit form
    document.getElementById('edit-location-id').value = location.id;
    document.getElementById('edit-location-customer').value = location.customer_id;
    document.getElementById('edit-location-name').value = location.location_name;
    document.getElementById('edit-water-body-name').value = location.water_body_name || '';
    document.getElementById('edit-location-city').value = location.city || '';
    document.getElementById('edit-location-state').value = location.state || '';
    document.getElementById('edit-location-zip').value = location.zip_code || '';
    document.getElementById('edit-location-latitude').value = location.latitude;
    document.getElementById('edit-location-longitude').value = location.longitude;
    document.getElementById('edit-location-timezone').value = location.timezone || 'America/Los_Angeles';
    document.getElementById('edit-location-active').checked = location.is_active;
    
    // Show modal
    openModal('edit-location');
  } catch (error) {
    console.error('Error loading location:', error);
    alert('Failed to load location details');
  }
}

// Load customers for edit location dropdown
async function loadCustomersForEditLocation() {
  try {
    const response = await fetch(`${API_BASE}/customers`);
    const customers = await response.json();
    
    const select = document.getElementById('edit-location-customer');
    if (select) {
      select.innerHTML = '<option value="">Select customer...</option>' +
        customers.map(c => `<option value="${c.id}">${c.company_name}</option>`).join('');
    }
  } catch (error) {
    console.error('Error loading customers for select:', error);
  }
}

// Save settings (alternative to form submit)
async function saveSettings() {
  const beginnerWind = document.getElementById('beginner-wind').value;
  const intermediateWind = document.getElementById('intermediate-wind').value;
  const weatherApiKey = document.getElementById('weather-api-key').value;
  const refreshInterval = document.getElementById('refresh-interval').value;
  const cacheExpiry = document.getElementById('cache-expiry').value;
  
  const settings = {
    'beginner_wind_max_mph': beginnerWind,
    'intermediate_wind_max_mph': intermediateWind,
    'weather_api_key': weatherApiKey,
    'refresh_interval_minutes': refreshInterval,
    'cache_expiry_minutes': cacheExpiry
  };
  
  try {
    const response = await fetch(`${API_BASE}/settings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify(settings)
    });
    
    const result = await response.json();
    
    if (response.ok && result.success) {
      alert('Settings saved successfully!');
    } else {
      alert('Error: ' + (result.error || 'Failed to save settings'));
    }
  } catch (error) {
    console.error('Error saving settings:', error);
    alert('Network error. Please try again.');
  }
}
