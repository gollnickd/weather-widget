/**
 * Admin Dashboard JavaScript
 * Handles all interactive functionality for the admin panel
 */

const API_BASE = '/admin/api';

// Tab switching
document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', function() {
        // Remove active class from all buttons and contents
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        
        // Add active class to clicked button and corresponding content
        this.classList.add('active');
        const tabId = this.getAttribute('data-tab');
        document.getElementById(tabId).classList.add('active');
        
        // Load data for the tab
        loadTabData(tabId);
    });
});

// Modal functions
function openModal(modalId) {
    document.getElementById(modalId).classList.add('active');
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
}

// Close modal when clicking outside
document.querySelectorAll('.modal').forEach(modal => {
    modal.addEventListener('click', function(e) {
        if (e.target === this) {
            this.classList.remove('active');
        }
    });
});

// Load tab-specific data
function loadTabData(tabId) {
    switch(tabId) {
        case 'dashboard':
            loadDashboard();
            break;
        case 'customers':
            loadCustomers();
            break;
        case 'locations':
            loadLocations();
            break;
        case 'refresh-log':
            loadRefreshLog();
            break;
    }
}

// Load dashboard data
async function loadDashboard() {
    try {
        // Load statistics
        const statsResponse = await fetch(`${API_BASE}/stats.php`);
        const stats = await statsResponse.json();
        
        document.getElementById('stat-customers').textContent = stats.active_customers || '0';
        document.getElementById('stat-locations').textContent = stats.active_locations || '0';
        document.getElementById('stat-loads').textContent = stats.widget_loads_today || '0';
        document.getElementById('stat-last-refresh').textContent = stats.last_refresh || 'Never';
        document.getElementById('next-refresh').textContent = stats.next_refresh_minutes || '--';
        
        // Load recent refreshes
        const refreshResponse = await fetch(`${API_BASE}/refresh_log.php?limit=10`);
        const refreshes = await refreshResponse.json();
        
        const tbody = document.querySelector('#recent-refreshes tbody');
        tbody.innerHTML = refreshes.data.map(log => `
            <tr>
                <td>${formatDateTime(log.started_at)}</td>
                <td><span class="status-badge status-info">${log.refresh_type}</span></td>
                <td><span class="status-badge status-${log.status === 'success' ? 'success' : 'danger'}">${log.status}</span></td>
                <td>${log.locations_updated || 0}</td>
                <td>${log.api_calls_made || 0}</td>
                <td>${log.execution_time_ms}ms</td>
            </tr>
        `).join('');
        
        // Load current conditions
        const conditionsResponse = await fetch(`${API_BASE}/current_conditions.php`);
        const conditions = await conditionsResponse.json();
        
        const conditionsTbody = document.querySelector('#conditions-overview tbody');
        conditionsTbody.innerHTML = conditions.data.map(condition => `
            <tr>
                <td>${condition.location_name}, ${condition.city}</td>
                <td>
                    <span class="condition-indicator condition-${condition.condition_level}"></span>
                    ${condition.condition_level}
                </td>
                <td>${condition.wind_speed} mph</td>
                <td>${condition.wave_height} ft</td>
                <td>${formatDateTime(condition.fetched_at)}</td>
            </tr>
        `).join('');
        
    } catch (error) {
        console.error('Error loading dashboard:', error);
        showAlert('Error loading dashboard data', 'danger');
    }
}

// Load customers
async function loadCustomers() {
    try {
        const response = await fetch(`${API_BASE}/customers.php`);
        const data = await response.json();
        
        const tbody = document.querySelector('#customers-table tbody');
        
        if (data.data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="8" class="empty-state">No customers found</td></tr>';
            return;
        }
        
        tbody.innerHTML = data.data.map(customer => `
            <tr>
                <td>${customer.customer_id}</td>
                <td><strong>${customer.customer_name}</strong></td>
                <td><a href="${customer.website_url}" target="_blank">${customer.website_url || 'N/A'}</a></td>
                <td>${customer.email}</td>
                <td><code style="font-size: 11px;">${customer.api_key}</code></td>
                <td><span class="status-badge status-${customer.status === 'active' ? 'success' : 'warning'}">${customer.status}</span></td>
                <td>${customer.location_count || 0}</td>
                <td>
                    <button class="btn btn-sm btn-secondary" onclick="editCustomer(${customer.customer_id})">Edit</button>
                    <button class="btn btn-sm btn-danger" onclick="deleteCustomer(${customer.customer_id})">Delete</button>
                </td>
            </tr>
        `).join('');
        
        // Populate customer dropdown in location form
        const customerSelect = document.getElementById('location-customer-select');
        customerSelect.innerHTML = '<option value="">Select customer...</option>' + 
            data.data.map(c => `<option value="${c.customer_id}">${c.customer_name}</option>`).join('');
        
    } catch (error) {
        console.error('Error loading customers:', error);
        showAlert('Error loading customers', 'danger');
    }
}

// Load locations
async function loadLocations() {
    try {
        const response = await fetch(`${API_BASE}/locations.php`);
        const data = await response.json();
        
        const tbody = document.querySelector('#locations-table tbody');
        
        if (data.data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="8" class="empty-state">No locations found</td></tr>';
            return;
        }
        
        tbody.innerHTML = data.data.map(location => `
            <tr>
                <td>${location.location_id}</td>
                <td><strong>${location.location_name}</strong></td>
                <td>${location.body_of_water || 'N/A'}</td>
                <td>${location.city}, ${location.state}</td>
                <td>${location.customer_name}</td>
                <td>${location.latitude}, ${location.longitude}</td>
                <td><span class="status-badge status-${location.status === 'active' ? 'success' : 'warning'}">${location.status}</span></td>
                <td>
                    <button class="btn btn-sm btn-secondary" onclick="editLocation(${location.location_id})">Edit</button>
                    <button class="btn btn-sm btn-danger" onclick="deleteLocation(${location.location_id})">Delete</button>
                </td>
            </tr>
        `).join('');
        
    } catch (error) {
        console.error('Error loading locations:', error);
        showAlert('Error loading locations', 'danger');
    }
}

// Load refresh log
async function loadRefreshLog() {
    try {
        const response = await fetch(`${API_BASE}/refresh_log.php?limit=100`);
        const data = await response.json();
        
        const tbody = document.querySelector('#refresh-log-table tbody');
        
        if (data.data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="8" class="empty-state">No refresh logs found</td></tr>';
            return;
        }
        
        tbody.innerHTML = data.data.map(log => `
            <tr>
                <td>${formatDateTime(log.started_at)}</td>
                <td>${log.completed_at ? formatDateTime(log.completed_at) : 'In Progress'}</td>
                <td><span class="status-badge status-info">${log.refresh_type}</span></td>
                <td><span class="status-badge status-${log.status === 'success' ? 'success' : log.status === 'partial' ? 'warning' : 'danger'}">${log.status}</span></td>
                <td>${log.api_calls_made || 0}</td>
                <td>${log.locations_updated || 0}</td>
                <td>${log.execution_time_ms || 0}ms</td>
                <td>${log.error_message || '-'}</td>
            </tr>
        `).join('');
        
    } catch (error) {
        console.error('Error loading refresh log:', error);
        showAlert('Error loading refresh log', 'danger');
    }
}

// Manual refresh trigger
async function manualRefresh() {
    if (!confirm('Trigger a manual refresh of all locations? This will fetch fresh weather data.')) {
        return;
    }
    
    try {
        const btn = event.target;
        btn.disabled = true;
        btn.textContent = '⏳ Refreshing...';
        
        const response = await fetch(`${API_BASE}/manual_refresh.php`, {
            method: 'POST'
        });
        const result = await response.json();
        
        if (result.success) {
            showAlert(`Successfully refreshed ${result.data.success} locations`, 'success');
            loadTabData('refresh-log');
        } else {
            showAlert('Refresh failed: ' + result.error, 'danger');
        }
        
        btn.disabled = false;
        btn.textContent = '🔄 Refresh Now';
        
    } catch (error) {
        console.error('Error triggering refresh:', error);
        showAlert('Error triggering refresh', 'danger');
        event.target.disabled = false;
        event.target.textContent = '🔄 Refresh Now';
    }
}

// Form handlers
document.getElementById('add-customer-form').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const formData = new FormData(this);
    const data = Object.fromEntries(formData);
    
    try {
        const response = await fetch(`${API_BASE}/customers.php`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        
        const result = await response.json();
        
        if (result.success) {
            showAlert('Customer created successfully!', 'success');
            closeModal('add-customer-modal');
            this.reset();
            loadCustomers();
        } else {
            showAlert('Error: ' + result.error, 'danger');
        }
    } catch (error) {
        console.error('Error creating customer:', error);
        showAlert('Error creating customer', 'danger');
    }
});

document.getElementById('add-location-form').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const formData = new FormData(this);
    const data = Object.fromEntries(formData);
    
    try {
        const response = await fetch(`${API_BASE}/locations.php`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        
        const result = await response.json();
        
        if (result.success) {
            showAlert('Location created successfully!', 'success');
            closeModal('add-location-modal');
            this.reset();
            loadLocations();
        } else {
            showAlert('Error: ' + result.error, 'danger');
        }
    } catch (error) {
        console.error('Error creating location:', error);
        showAlert('Error creating location', 'danger');
    }
});

// Utility functions
function formatDateTime(dateString) {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function showAlert(message, type) {
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type}`;
    alertDiv.textContent = message;
    alertDiv.style.position = 'fixed';
    alertDiv.style.top = '20px';
    alertDiv.style.right = '20px';
    alertDiv.style.zIndex = '10000';
    alertDiv.style.minWidth = '300px';
    
    document.body.appendChild(alertDiv);
    
    setTimeout(() => {
        alertDiv.remove();
    }, 5000);
}

// Placeholder edit/delete functions (to be implemented)
function editCustomer(id) {
    showAlert('Edit functionality coming soon', 'info');
}

function deleteCustomer(id) {
    if (confirm('Are you sure you want to delete this customer?')) {
        showAlert('Delete functionality coming soon', 'info');
    }
}

function editLocation(id) {
    showAlert('Edit functionality coming soon', 'info');
}

function deleteLocation(id) {
    if (confirm('Are you sure you want to delete this location?')) {
        showAlert('Delete functionality coming soon', 'info');
    }
}

// Initial load
loadDashboard();
