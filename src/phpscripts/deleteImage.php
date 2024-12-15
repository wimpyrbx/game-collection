<?php
// Get the miniature ID from the POST request
$miniId = isset($_POST['id']) ? intval($_POST['id']) : null;

if (!$miniId) {
    http_response_code(400);
    echo json_encode(['error' => 'Missing or invalid miniature ID']);
    exit;
}

// Base directory for miniature images
$baseDir = __DIR__ . '/../../public/images/miniatures/';

// Function to recursively find and delete files
function deleteImagesRecursively($dir, $miniId) {
    $pattern = $miniId . '.webp';
    $deleted = [];
    
    // Get all .webp files in current directory and subdirectories
    $files = new RecursiveIteratorIterator(
        new RecursiveDirectoryIterator($dir, RecursiveDirectoryIterator::SKIP_DOTS),
        RecursiveIteratorIterator::CHILD_FIRST
    );
    
    foreach ($files as $file) {
        if ($file->isFile() && $file->getFilename() === $pattern) {
            if (unlink($file->getRealPath())) {
                $deleted[] = str_replace($dir, '', $file->getRealPath());
            }
        }
    }
    
    return $deleted;
}

try {
    // Delete all matching images
    $deletedFiles = deleteImagesRecursively($baseDir, $miniId);
    
    // Return success response
    echo json_encode([
        'success' => true,
        'deleted_files' => $deletedFiles
    ]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'error' => 'Failed to delete images',
        'message' => $e->getMessage()
    ]);
} 