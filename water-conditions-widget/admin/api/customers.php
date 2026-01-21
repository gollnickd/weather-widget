<?php
/**
 * Admin API - Customers Management
 */

session_start();
require_once '../../backend/config.php';
require_once '../../backend/Database.php';

header('Content-Type: application/json');

// Check if user is logged in
if (!isset($_SESSION['admin_logged_in']) || !$_SESSION['admin_logged_in']) {
    http_response_code(401);
    echo json_encode(['error' => 'Unauthorized']);
    exit;
}

$method = $_SERVER['REQUEST_METHOD'];
$customerModel = new CustomerModel();

try {
    switch ($method) {
        case 'GET':
            // Get all customers with location count
            $db = Database::getInstance()->getConnection();
            $stmt = $db->query("
                SELECT c.*, 
                       COUNT(l.location_id) as location_count
                FROM customers c
                LEFT JOIN locations l ON c.customer_id = l.customer_id
                GROUP BY c.customer_id
                ORDER BY c.customer_name
            ");
            $customers = $stmt->fetchAll();
            
            echo json_encode([
                'success' => true,
                'data' => $customers
            ]);
            break;
            
        case 'POST':
            // Create new customer
            $input = json_decode(file_get_contents('php://input'), true);
            
            if (!isset($input['customer_name']) || !isset($input['email'])) {
                throw new Exception('Customer name and email are required');
            }
            
            // Generate API key
            $apiKey = $customerModel->generateApiKey();
            
            $data = [
                'customer_name' => $input['customer_name'],
                'website_url' => $input['website_url'] ?? null,
                'email' => $input['email'],
                'api_key' => $apiKey,
                'status' => $input['status'] ?? 'active'
            ];
            
            $result = $customerModel->createCustomer($data);
            
            if ($result) {
                logMessage("Customer created: {$input['customer_name']}", "INFO");
                echo json_encode([
                    'success' => true,
                    'message' => 'Customer created successfully',
                    'api_key' => $apiKey
                ]);
            } else {
                throw new Exception('Failed to create customer');
            }
            break;
            
        default:
            http_response_code(405);
            echo json_encode(['error' => 'Method not allowed']);
    }
    
} catch (Exception $e) {
    logMessage("Admin API error (customers): " . $e->getMessage(), "ERROR");
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}
