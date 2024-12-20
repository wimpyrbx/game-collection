from ftplib import FTP_TLS
import os
from datetime import datetime
import zipfile
import argparse
from dotenv import load_dotenv # type: ignore
from colorama import Fore, Style, init # type: ignore
from typing import List, Dict, Set

init(autoreset=True)

def verify_miniatures_dir(ftps: FTP_TLS) -> None:
    """Verify we're working within /miniatures/ directory structure"""
    current = ftps.pwd()
    if not current.startswith('/miniatures'):
        raise Exception(f"{Fore.RED}Safety Error: Working directory {current} is outside of /miniatures/")


def read_credentials() -> Dict[str, str]:
    load_dotenv('../.env')
    return {
        'ftp_user': os.getenv('FTP_USER'),
        'ftp_pass': os.getenv('FTP_PASS')
    }

def should_process_path(path: str, include_images: bool) -> bool:
    """Determine if a path should be processed based on configuration"""
    path_parts = path.split(os.sep) if os.sep in path else path.split('/')
    # Don't process if it's the images directory or any subdirectory of images
    if not include_images and ('images' in path_parts or path == 'images'):
        return False
    return True

def create_backup(local_dir: str, include_images: bool = False) -> None:
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    backup_name = f"dist_{timestamp}.zip"
    
    with zipfile.ZipFile(backup_name, 'w') as zipf:
        for root, _, files in os.walk(local_dir):
            if not should_process_path(root, include_images):
                continue
                
            for file in files:
                full_path = os.path.join(root, file)
                relative_path = os.path.relpath(full_path, local_dir)
                zipf.write(full_path, relative_path)
                print(f"{Fore.CYAN}Backed up: {Fore.YELLOW}{full_path}")
    
    print(f"{Fore.GREEN}Backup created: {Fore.YELLOW}{backup_name}")

def safe_ftp_operation(ftps: FTP_TLS, operation: callable, *args, **kwargs):
    """Wrapper to ensure operations stay within /miniatures/"""
    verify_miniatures_dir(ftps)
    result = operation(*args, **kwargs)
    verify_miniatures_dir(ftps)
    return result

def clean_directory_recursive(ftps: FTP_TLS, path: str, include_images: bool) -> None:
    """Recursively clean a directory and its subdirectories"""
    verify_miniatures_dir(ftps)
    
    # Skip if this is an images path and we're not including images
    if not should_process_path(path, include_images):
        print(f"{Fore.CYAN}Skipping {path} (use --images to include)")
        return
        
    for item in ftps.nlst():
        if item in ('.', '..'):
            continue
            
        # Build the full path for checking
        full_path = f"{path}/{item}"
        if not should_process_path(full_path, include_images):
            print(f"{Fore.CYAN}Skipping {full_path} (use --images to include)")
            continue
            
        try:
            ftps.cwd(item)  # Try to enter item as directory
            verify_miniatures_dir(ftps)
            ftps.cwd('..')  # Go back up
            verify_miniatures_dir(ftps)
            # If we got here, it's a directory
            ftps.cwd(item)
            verify_miniatures_dir(ftps)
            clean_directory_recursive(ftps, full_path, include_images)
            ftps.cwd('..')
            verify_miniatures_dir(ftps)
            ftps.rmd(item)
            print(f"{Fore.GREEN}Deleted remote folder: {Fore.YELLOW}{full_path}/")
        except Exception:
            # If we couldn't cwd into it, it's a file
            ftps.delete(item)
            print(f"{Fore.GREEN}Deleted remote file: {Fore.YELLOW}{full_path}")
    verify_miniatures_dir(ftps)

def get_valid_directories() -> List[str]:
    """Returns list of valid top-level directories"""
    return ['assets', 'phpscripts']  # images handled separately

def clean_remote(ftps: FTP_TLS, include_images: bool = False) -> None:
    verify_miniatures_dir(ftps)
    print(f"{Fore.CYAN}Cleaning remote files...")
    
    valid_dirs = get_valid_directories()
    if include_images:
        valid_dirs.append('images')
    
    # Clean only expected directories and root files
    files = [f for f in ftps.nlst() if f not in ('.', '..')]
    
    for item in files:
        # Skip images directory if not included
        if not include_images and item == 'images':
            print(f"{Fore.CYAN}Skipping {item} (use --images to include)")
            continue
            
        try:
            # Only enter and clean valid top-level directories
            if item in valid_dirs:
                ftps.cwd(item)
                for subitem in ftps.nlst():
                    if subitem not in ('.', '..'):
                        try:
                            ftps.delete(subitem)
                            print(f"{Fore.GREEN}Deleted remote file: {Fore.YELLOW}/miniatures/{item}/{subitem}")
                        except Exception as e:
                            print(f"{Fore.RED}Failed to delete: /miniatures/{item}/{subitem} - {str(e)}")
                ftps.cwd('..')
                ftps.rmd(item)
                print(f"{Fore.GREEN}Deleted remote folder: {Fore.YELLOW}/miniatures/{item}/")
            # Handle root files
            elif '.' in item:
                try:
                    ftps.delete(item)
                    print(f"{Fore.GREEN}Deleted remote file: {Fore.YELLOW}/miniatures/{item}")
                except Exception as e:
                    print(f"{Fore.RED}Failed to delete: /miniatures/{item} - {str(e)}")
        except Exception as e:
            if '550' not in str(e):  # If error is not "no such file/directory"
                print(f"{Fore.RED}Error during cleanup: {str(e)}")
            else:
                print(f"{Fore.CYAN}Note: {str(e)}")
    
    verify_miniatures_dir(ftps)

def upload_directory_recursive(ftps: FTP_TLS, local_path: str, remote_base: str, include_images: bool) -> None:
    """Recursively upload a directory and its contents"""
    verify_miniatures_dir(ftps)
    
    # Skip if this is an images path and we're not including images
    if not should_process_path(local_path, include_images):
        print(f"{Fore.CYAN}Skipping {local_path} (use --images to include)")
        return
        
    if os.path.isfile(local_path):
        try:
            with open(local_path, 'rb') as f:
                ftps.storbinary(f'STOR {os.path.basename(local_path)}', f)
            print(f"{Fore.GREEN}Uploaded: {Fore.YELLOW}{local_path} -> {remote_base}/{os.path.basename(local_path)}")
        except Exception as e:
            print(f"{Fore.RED}Failed to upload: {local_path} - {str(e)}")
        return

    # Get the relative path from dist directory to avoid duplicate folders
    rel_path = os.path.relpath(local_path, '../dist')
    if rel_path == '.' or rel_path == remote_base.split('/')[-1]:
        base_dir = local_path
    else:
        # Handle directory
        dir_name = os.path.basename(local_path)
        try:
            ftps.mkd(dir_name)
        except:
            pass  # Directory might already exist
        ftps.cwd(dir_name)
        base_dir = local_path
        
    # Process all items in directory
    for item in os.listdir(base_dir):
        item_local_path = os.path.join(base_dir, item)
        upload_directory_recursive(ftps, item_local_path, remote_base, include_images)

    # Only go back up if we actually went down
    if rel_path != '.' and rel_path != remote_base.split('/')[-1]:
        ftps.cwd('..')

def upload_files(ftps: FTP_TLS, local_dir: str, include_images: bool = False) -> None:
    verify_miniatures_dir(ftps)
    print(f"{Fore.CYAN}Uploading files...")
    
    # Upload everything in dist directory
    for item in os.listdir(local_dir):
        local_path = os.path.join(local_dir, item)
        
        # Skip images directory if not included
        if not should_process_path(local_path, include_images):
            print(f"{Fore.CYAN}Skipping {item} (use --images to include)")
            continue
            
        if os.path.isfile(local_path):
            try:
                with open(local_path, 'rb') as f:
                    ftps.storbinary(f'STOR {item}', f)
                print(f"{Fore.GREEN}Uploaded: {Fore.YELLOW}{local_path} -> /miniatures/{item}")
            except Exception as e:
                print(f"{Fore.RED}Failed to upload: {local_path} - {str(e)}")
        else:
            # Handle directory
            try:
                ftps.mkd(item)
            except:
                pass
            ftps.cwd(item)
            upload_directory_recursive(ftps, local_path, f"/miniatures/{item}", include_images)
            ftps.cwd('..')
            verify_miniatures_dir(ftps)

def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument('--images', action='store_true', help='Include images directory in operations')
    parser.add_argument('--backup', action='store_true', help='Create backup before deployment')
    args = parser.parse_args()

    creds = read_credentials()

    if args.backup:
        create_backup('../dist', args.images)

    try:
        ftps = FTP_TLS('ftp.emuxtras.net')
        ftps.login(creds['ftp_user'], creds['ftp_pass'])
        ftps.prot_p()
        ftps.cwd('/miniatures/')
        verify_miniatures_dir(ftps)
        
        clean_remote(ftps, args.images)
        upload_files(ftps, '../dist', args.images)
        ftps.quit()
        
        print(f"{Fore.GREEN}All operations completed successfully!")
    except Exception as e:
        print(f"{Fore.RED}Fatal error: {str(e)}")

if __name__ == "__main__":
    main()