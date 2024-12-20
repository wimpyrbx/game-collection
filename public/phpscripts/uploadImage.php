<?php
header('Content-Type: application/json');

// Function to get the directory path for a miniature ID
function getMiniaturePath($id, $type = 'original') {
    // Convert ID to string
    $idStr = strval($id);
    // First digit is always the first character
    $firstDigit = $idStr[0];
    // Second digit is the second character or '0' if not present
    $secondDigit = strlen($idStr) > 1 ? $idStr[1] : '0';
    
    return dirname(__DIR__) . "/images/miniatures/$type/$firstDigit/$secondDigit";
}

function getUploadError($code) {
    switch ($code) {
        case UPLOAD_ERR_INI_SIZE:
            return 'The uploaded file exceeds the upload_max_filesize directive in php.ini';
        case UPLOAD_ERR_FORM_SIZE:
            return 'The uploaded file exceeds the MAX_FILE_SIZE directive in the HTML form';
        case UPLOAD_ERR_PARTIAL:
            return 'The uploaded file was only partially uploaded';
        case UPLOAD_ERR_NO_FILE:
            return 'No file was uploaded';
        case UPLOAD_ERR_NO_TMP_DIR:
            return 'Missing a temporary folder';
        case UPLOAD_ERR_CANT_WRITE:
            return 'Failed to write file to disk';
        case UPLOAD_ERR_EXTENSION:
            return 'A PHP extension stopped the file upload';
        default:
            return 'Unknown upload error';
    }
}

try {
    // Detailed request validation
    if (!isset($_FILES['image'])) {
        throw new Exception('No image file received in the request');
    }
    if (!isset($_POST['miniId'])) {
        throw new Exception('No miniature ID received in the request');
    }

    $miniId = intval($_POST['miniId']);
    if ($miniId <= 0) {
        throw new Exception('Invalid miniature ID: ' . $miniId);
    }

    $image = $_FILES['image'];
    if ($image['error'] !== UPLOAD_ERR_OK) {
        throw new Exception('File upload error: ' . getUploadError($image['error']));
    }

    // Verify file size
    if ($image['size'] <= 0) {
        throw new Exception('Uploaded file is empty (0 bytes)');
    }

    // Verify it's an image and get dimensions
    $imageInfo = @getimagesize($image['tmp_name']);
    if ($imageInfo === false) {
        throw new Exception('Uploaded file is not a valid image');
    }

    list($width, $height, $type) = $imageInfo;
    
    // Check if image is square
    if ($width !== $height) {
        throw new Exception(sprintf(
            'Image must be square (1:1 ratio). Current dimensions: %dx%d (ratio: %.2f:1)',
            $width, $height, $width/$height
        ));
    }

    // Verify supported image type
    $supportedTypes = [
        IMAGETYPE_JPEG => 'JPEG',
        IMAGETYPE_PNG => 'PNG',
        IMAGETYPE_GIF => 'GIF',
        IMAGETYPE_WEBP => 'WEBP'
    ];
    
    if (!isset($supportedTypes[$type])) {
        throw new Exception(sprintf(
            'Unsupported image type. Received: %s. Supported types: %s',
            image_type_to_mime_type($type),
            implode(', ', array_values($supportedTypes))
        ));
    }

    // Create directories if they don't exist
    $types = ['original', 'thumb', 'full'];
    foreach ($types as $type) {
        $directory = getMiniaturePath($miniId, $type);
        if (!file_exists($directory)) {
            if (!@mkdir($directory, 0755, true)) {
                throw new Exception(sprintf(
                    'Failed to create directory: %s. Error: %s',
                    $directory,
                    error_get_last()['message'] ?? 'Unknown error'
                ));
            }
        }
    }

    // Process the original image
    $originalPath = getMiniaturePath($miniId, 'original') . "/$miniId.webp";
    
    // Convert to WebP and save original
    $sourceImage = @imagecreatefromstring(file_get_contents($image['tmp_name']));
    if (!$sourceImage) {
        throw new Exception(sprintf(
            'Failed to create image resource from uploaded file. PHP error: %s',
            error_get_last()['message'] ?? 'Unknown error'
        ));
    }

    // Save original
    if (!@imagewebp($sourceImage, $originalPath, 90)) {
        throw new Exception(sprintf(
            'Failed to save original WebP image. Path: %s. PHP error: %s',
            $originalPath,
            error_get_last()['message'] ?? 'Unknown error'
        ));
    }
    
    // Create thumbnail version (150x150)
    $thumbPath = getMiniaturePath($miniId, 'thumb') . "/$miniId.webp";
    $thumbSize = 150;
    
    $thumbImage = @imagecreatetruecolor($thumbSize, $thumbSize);
    if (!$thumbImage) {
        throw new Exception('Failed to create thumbnail image resource');
    }

    // Set up alpha channel for thumbnail
    if (!@imagealphablending($thumbImage, false) || !@imagesavealpha($thumbImage, true)) {
        throw new Exception('Failed to set up alpha channel for thumbnail');
    }
    
    // Create transparent background
    $transparent = @imagecolorallocatealpha($thumbImage, 0, 0, 0, 127);
    if ($transparent === false) {
        throw new Exception('Failed to allocate transparent color for thumbnail');
    }
    
    if (!@imagefilledrectangle($thumbImage, 0, 0, $thumbSize, $thumbSize, $transparent)) {
        throw new Exception('Failed to create transparent background for thumbnail');
    }
    
    // Resize and save thumbnail
    if (!@imagecopyresampled(
        $thumbImage, $sourceImage,
        0, 0, 0, 0,
        $thumbSize, $thumbSize,
        $width, $height
    )) {
        throw new Exception('Failed to resize image for thumbnail');
    }

    if (!@imagewebp($thumbImage, $thumbPath, 80)) {
        throw new Exception(sprintf(
            'Failed to save thumbnail WebP image. Path: %s. PHP error: %s',
            $thumbPath,
            error_get_last()['message'] ?? 'Unknown error'
        ));
    }
    
    // Create full version (800x800)
    $fullPath = getMiniaturePath($miniId, 'full') . "/$miniId.webp";
    $fullSize = 800;
    
    $fullImage = @imagecreatetruecolor($fullSize, $fullSize);
    if (!$fullImage) {
        throw new Exception('Failed to create full-size image resource');
    }

    // Set up alpha channel for full image
    if (!@imagealphablending($fullImage, false) || !@imagesavealpha($fullImage, true)) {
        throw new Exception('Failed to set up alpha channel for full-size image');
    }
    
    if (!@imagefilledrectangle($fullImage, 0, 0, $fullSize, $fullSize, $transparent)) {
        throw new Exception('Failed to create transparent background for full-size image');
    }
    
    // Resize and save full version
    if (!@imagecopyresampled(
        $fullImage, $sourceImage,
        0, 0, 0, 0,
        $fullSize, $fullSize,
        $width, $height
    )) {
        throw new Exception('Failed to resize image for full-size version');
    }

    if (!@imagewebp($fullImage, $fullPath, 85)) {
        throw new Exception(sprintf(
            'Failed to save full-size WebP image. Path: %s. PHP error: %s',
            $fullPath,
            error_get_last()['message'] ?? 'Unknown error'
        ));
    }
    
    // Clean up
    imagedestroy($sourceImage);
    imagedestroy($thumbImage);
    imagedestroy($fullImage);
    
    echo json_encode([
        'success' => true,
        'message' => 'Image uploaded and processed successfully',
        'details' => [
            'originalDimensions' => [
                'width' => $width,
                'height' => $height
            ],
            'paths' => [
                'original' => $originalPath,
                'thumb' => $thumbPath,
                'full' => $fullPath
            ],
            'sizes' => [
                'original' => filesize($originalPath),
                'thumb' => filesize($thumbPath),
                'full' => filesize($fullPath)
            ]
        ]
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage(),
        'details' => [
            'file' => $e->getFile(),
            'line' => $e->getLine(),
            'trace' => $e->getTraceAsString(),
            'phpVersion' => PHP_VERSION,
            'uploadedFile' => isset($_FILES['image']) ? [
                'name' => $_FILES['image']['name'],
                'type' => $_FILES['image']['type'],
                'size' => $_FILES['image']['size'],
                'error' => isset($_FILES['image']['error']) ? getUploadError($_FILES['image']['error']) : 'Unknown'
            ] : null,
            'miniId' => isset($_POST['miniId']) ? $_POST['miniId'] : null,
            'phpErrors' => error_get_last()
        ]
    ]);
} 