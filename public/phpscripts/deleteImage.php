<?php
header('Content-Type: application/json');

// Function to get the directory path for a miniature ID (matching uploadImage.php)
function getMiniaturePath($id, $type = 'original') {
    // Convert ID to string
    $idStr = strval($id);
    // First digit is always the first character
    $firstDigit = $idStr[0];
    // Second digit is the second character or '0' if not present
    $secondDigit = strlen($idStr) > 1 ? $idStr[1] : '0';
    
    $path = dirname(__DIR__) . "/images/miniatures/$type/$firstDigit/$secondDigit";
    error_log("Generated path for ID $id ($type): $path");
    return $path;
}

// Get the miniature ID from the POST request
$miniId = isset($_POST['id']) ? intval($_POST['id']) : null;

if (!$miniId) {
    http_response_code(400);
    echo json_encode(['error' => 'Missing or invalid miniature ID']);
    exit;
}

// Base directory for miniature images
$baseDir = dirname(__DIR__) . '/images/miniatures/';

// Function to delete images for a specific miniature ID
function deleteImagesForId($miniId) {
    $types = ['original', 'thumb', 'full'];
    $deleted = [];
    $errors = [];
    
    foreach ($types as $type) {
        $path = getMiniaturePath($miniId, $type) . "/$miniId.webp";
        error_log("Attempting to delete: $path");
        
        if (!file_exists($path)) {
            error_log("File does not exist: $path");
            continue;
        }
        
        if (!is_writable($path)) {
            $errors[] = "File not writable: $path";
            error_log("File not writable: $path");
            continue;
        }
        
        if (unlink($path)) {
            $deleted[] = str_replace(dirname(__DIR__), '', $path);
            error_log("Successfully deleted: $path");
        } else {
            $errors[] = "Failed to delete: $path";
            error_log("Failed to delete: $path");
        }
    }
    
    // Clean up empty directories
    foreach ($types as $type) {
        $dir = getMiniaturePath($miniId, $type);
        if (is_dir($dir)) {
            error_log("Checking directory for cleanup: $dir");
            if (count(scandir($dir)) <= 2) { // Only . and .. remain
                if (@rmdir($dir)) {
                    error_log("Removed empty directory: $dir");
                    // Try to remove parent directory if empty
                    $parentDir = dirname($dir);
                    if (is_dir($parentDir) && count(scandir($parentDir)) <= 2) {
                        if (@rmdir($parentDir)) {
                            error_log("Removed empty parent directory: $parentDir");
                        }
                    }
                } else {
                    error_log("Failed to remove directory: $dir");
                }
            }
        }
    }
    
    return ['deleted' => $deleted, 'errors' => $errors];
}

try {
    // Verify base directory exists
    if (!is_dir($baseDir)) {
        throw new Exception("Base directory does not exist: $baseDir");
    }

    if (!is_writable($baseDir)) {
        throw new Exception("Base directory is not writable: $baseDir");
    }

    // Delete all matching images
    $result = deleteImagesForId($miniId);
    
    if (empty($result['deleted']) && empty($result['errors'])) {
        echo json_encode([
            'success' => true,
            'message' => 'No files found to delete for ID: ' . $miniId,
            'deleted_files' => []
        ]);
    } else {
        echo json_encode([
            'success' => !empty($result['deleted']),
            'message' => 'Processed deletion request',
            'deleted_files' => $result['deleted'],
            'errors' => $result['errors']
        ]);
    }
} catch (Exception $e) {
    error_log("Error in deleteImage.php: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Failed to delete images',
        'message' => $e->getMessage(),
        'details' => [
            'miniId' => $miniId,
            'baseDir' => $baseDir
        ]
    ]);
} 