<!DOCTYPE html>
<html>
<head>
    <title>Upload Test</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            max-width: 800px;
            margin: 20px auto;
            padding: 20px;
        }
        .form-group {
            margin-bottom: 15px;
        }
        label {
            display: block;
            margin-bottom: 5px;
        }
        input[type="file"], input[type="number"] {
            padding: 5px;
            margin-bottom: 10px;
        }
        button {
            padding: 10px 15px;
            background-color: #4CAF50;
            color: white;
            border: none;
            cursor: pointer;
        }
        button:hover {
            background-color: #45a049;
        }
        .response {
            margin-top: 20px;
            padding: 15px;
            border: 1px solid #ddd;
            background-color: #f9f9f9;
        }
        pre {
            white-space: pre-wrap;
            word-wrap: break-word;
        }
    </style>
</head>
<body>
    <h1>Upload Test Form</h1>
    
    <form action="uploadImage.php" method="POST" enctype="multipart/form-data">
        <div class="form-group">
            <label for="image">Image File:</label>
            <input type="file" name="image" id="image" accept="image/*" required>
        </div>
        
        <div class="form-group">
            <label for="miniId">Mini ID:</label>
            <input type="number" name="miniId" id="miniId" value="0" required>
        </div>
        
        <button type="submit">Upload Image</button>
    </form>

    <?php
    // Display response if this page was redirected back to
    if (isset($_GET['response'])) {
        echo '<div class="response">';
        echo '<h3>Upload Response:</h3>';
        echo '<pre>' . htmlspecialchars(urldecode($_GET['response'])) . '</pre>';
        echo '</div>';
    }
    ?>

    <div class="form-group" style="margin-top: 30px;">
        <h3>Current Directory Structure:</h3>
        <pre>
<?php
// Display the current directory structure
function listDirectoryContents($dir, $indent = '') {
    if (!is_dir($dir)) {
        echo htmlspecialchars($indent . "Directory not found: $dir") . "\n";
        return;
    }

    $files = scandir($dir);
    foreach ($files as $file) {
        if ($file != "." && $file != "..") {
            $path = $dir . '/' . $file;
            if (is_dir($path)) {
                echo htmlspecialchars($indent . '📁 ' . $file) . "\n";
                listDirectoryContents($path, $indent . '    ');
            } else {
                echo htmlspecialchars($indent . '📄 ' . $file) . "\n";
            }
        }
    }
}

// List contents of the current directory and the thumb/original directories
echo "Current directory:\n";
listDirectoryContents('.');
?>
        </pre>
    </div>
</body>
</html> 