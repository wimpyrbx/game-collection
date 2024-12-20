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
    
    return dirname(__DIR__) . "/images/miniatures/$type/$firstDigit/$secondDigit";
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
    
    foreach ($types as $type) {
        $path = getMiniaturePath($miniId, $type) . "/$miniId.webp";
        if (file_exists($path) && unlink($path)) {
            $deleted[] = str_replace(dirname(__DIR__), '', $path);
        }
    }
    
    // Clean up empty directories
    foreach ($types as $type) {
        $dir = getMiniaturePath($miniId, $type);
        if (is_dir($dir) && count(scandir($dir)) <= 2) { // Only . and .. remain
            @rmdir($dir); // Remove if empty
            // Try to remove parent directory if empty
            $parentDir = dirname($dir);
            if (is_dir($parentDir) && count(scandir($parentDir)) <= 2) {
                @rmdir($parentDir);
            }
        }
    }
    
    return $deleted;
}

try {
    // Verify base directory exists
    if (!is_dir($baseDir)) {
        throw new Exception("Base directory does not exist: $baseDir");
    }

    // Delete all matching images
    $deletedFiles = deleteImagesForId($miniId);
    
    if (empty($deletedFiles)) {
        echo json_encode([
            'success' => true,
            'message' => 'No files found to delete for ID: ' . $miniId,
            'deleted_files' => []
        ]);
    } else {
        echo json_encode([
            'success' => true,
            'message' => 'Successfully deleted ' . count($deletedFiles) . ' files',
            'deleted_files' => $deletedFiles
        ]);
    }
} catch (Exception $e) {
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