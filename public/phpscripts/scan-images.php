<?php
header('Content-Type: application/json');
error_reporting(E_ALL);
ini_set('display_errors', 1);

function scanDirectory($dir) {
    error_log("Scanning directory: " . $dir);
    $imageIds = [];
    
    if (!is_dir($dir)) {
        error_log("Directory does not exist: " . $dir);
        throw new Exception("Directory does not exist: " . $dir);
    }
    
    // Scan first level (0-9)
    foreach (glob($dir . "/*", GLOB_ONLYDIR) as $firstDir) {
        error_log("Scanning first level dir: " . $firstDir);
        // Scan second level (0-9)
        foreach (glob($firstDir . "/*", GLOB_ONLYDIR) as $secondDir) {
            error_log("Scanning second level dir: " . $secondDir);
            // Get all .webp files
            foreach (glob($secondDir . "/*.webp") as $image) {
                error_log("Found image: " . $image);
                // Extract ID from filename
                $id = basename($image, '.webp');
                if (is_numeric($id)) {
                    $imageIds[] = (int)$id;
                }
            }
        }
    }
    
    error_log("Found " . count($imageIds) . " images");
    return $imageIds;
}

try {
    $baseDir = dirname(__DIR__) . "/images/miniatures/thumb";
    error_log("Base directory: " . $baseDir);
    $imageIds = scanDirectory($baseDir);
    
    $response = [
        'success' => true,
        'imageIds' => $imageIds,
        'count' => count($imageIds)
    ];
    
    error_log("Sending response: " . json_encode($response));
    echo json_encode($response);
} catch (Exception $e) {
    error_log("Error in scan-images.php: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
} 