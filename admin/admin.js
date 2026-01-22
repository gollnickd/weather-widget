/**
 * Simple Admin Dashboard - Working Version
 */

const API_BASE = `${window.location.protocol}//${window.location.host}/api/admin`;

document.addEventListener('DOMContentLoaded', function() {
  console.log('Admin Dashboard loaded, API_BASE:', API_BASE);
  loadDashboardStats();
  loadCustomers();
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

// Dummy functions for buttons
function openModal() {}
function closeModal() {}
function setupFormHandlers() {}
