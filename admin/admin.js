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
        <td>${c.is_active ? 'Active' : 'Inactive'}</td>
        <td>-</td>
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
        <td><strong>${l.location_name}</strong></td>
        <td>${l.city}, ${l.state}</td>
        <td>${l.company_name}</td>
        <td>${l.condition_level || 'N/A'}</td>
        <td>${l.wind_speed_mph || 'N/A'} mph</td>
        <td>${l.temperature_f || 'N/A'}°F</td>
        <td>${l.fetched_at ? new Date(l.fetched_at).toLocaleTimeString() : 'Never'}</td>
      </tr>
    `).join('');
  } catch (error) {
    console.error('Error loading locations:', error);
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
    
    // Display settings in form
    // This would populate form fields if you have them
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
  
  // Settings Form
  const settingsForm = document.getElementById('settings-form');
  if (settingsForm) {
    settingsForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const beginnerWind = document.getElementById('beginner-wind').value;
      const intermediateWind = document.getElementById('intermediate-wind').value;
      
      const settings = {
        'beginner_wind_max_mph': beginnerWind,
        'intermediate_wind_max_mph': intermediateWind
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
    });
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

// Save settings (alternative to form submit)
async function saveSettings() {
  const beginnerWind = document.getElementById('beginner-wind').value;
  const intermediateWind = document.getElementById('intermediate-wind').value;
  
  const settings = {
    'beginner_wind_max_mph': beginnerWind,
    'intermediate_wind_max_mph': intermediateWind
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
