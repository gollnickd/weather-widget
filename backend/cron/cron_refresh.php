#!/usr/bin/env php
<?php
/**
 * Weather Data Refresh Cron Job
 * 
 * Add to crontab to run every 10 minutes:
 * */10 * * * * /usr/bin/php /path/to/cron_refresh.php >> /path/to/logs/cron.log 2>&1
 */

require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/../Database.php';
require_once __DIR__ . '/../WeatherService.php';

echo "[" . date('Y-m-d H:i:s') . "] Starting weather data refresh..." . PHP_EOL;

try {
    $weatherService = new WeatherService();
    $results = $weatherService->updateAllLocations();
    
    echo "[" . date('Y-m-d H:i:s') . "] Refresh completed:" . PHP_EOL;
    echo "  Total locations: {$results['total']}" . PHP_EOL;
    echo "  Successfully updated: {$results['success']}" . PHP_EOL;
    echo "  Failed: {$results['failed']}" . PHP_EOL;
    echo "  Execution time: {$results['execution_time_ms']}ms" . PHP_EOL;
    
    if ($results['failed'] > 0) {
        echo "  Warning: Some locations failed to update. Check logs for details." . PHP_EOL;
    }
    
    logMessage("Cron refresh completed: {$results['success']}/{$results['total']} locations updated in {$results['execution_time_ms']}ms", "INFO");
    
} catch (Exception $e) {
    echo "[" . date('Y-m-d H:i:s') . "] ERROR: " . $e->getMessage() . PHP_EOL;
    logMessage("Cron refresh failed: " . $e->getMessage(), "ERROR");
    exit(1);
}

exit(0);
