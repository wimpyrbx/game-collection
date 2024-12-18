from ftplib import FTP_TLS
import os
from datetime import datetime
import zipfile
import argparse
from dotenv import load_dotenv # type: ignore
from colorama import Fore, Style, init # type: ignore

init(autoreset=True)

def verify_miniatures_dir(ftps):
    current = ftps.pwd()
    if current.rstrip('/') != '/miniatures':
        raise Exception(f"{Fore.RED}Safety Error: Wrong directory: {current}. Must be in /miniatures/")

def read_credentials():
   load_dotenv('../.env')
   return {
       'ftp_user': os.getenv('FTP_USER'),
       'ftp_pass': os.getenv('FTP_PASS')
   }

def create_backup(local_dir, include_images=False):
   timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
   backup_name = f"dist_{timestamp}.zip"
   
   with zipfile.ZipFile(backup_name, 'w') as zipf:
       for item in os.listdir(local_dir):
           if os.path.isfile(os.path.join(local_dir, item)):
               zipf.write(os.path.join(local_dir, item))
               print(f"{Fore.CYAN}Backed up: {Fore.YELLOW}{os.path.join(local_dir, item)}")
       
       assets_dir = os.path.join(local_dir, 'assets')
       if os.path.exists(assets_dir):
           for root, _, files in os.walk(assets_dir):
               for file in files:
                   full_path = os.path.join(root, file)
                   zipf.write(full_path)
                   print(f"{Fore.CYAN}Backed up: {Fore.YELLOW}{full_path}")
                   
       if include_images:
           images_dir = os.path.join(local_dir, 'images')
           if os.path.exists(images_dir):
               for root, _, files in os.walk(images_dir):
                   for file in files:
                       full_path = os.path.join(root, file)
                       zipf.write(full_path)
                       print(f"{Fore.CYAN}Backed up: {Fore.YELLOW}{full_path}")
   
   print(f"{Fore.GREEN}Backup created: {Fore.YELLOW}{backup_name}")

def clean_remote(ftps, include_images=False):
   verify_miniatures_dir(ftps)
   print(f"{Fore.CYAN}Cleaning remote files...")
   
   files = [f for f in ftps.nlst() if f not in ('.', '..')]
   for item in files:
       if '.' in item:
           try:
               ftps.delete(item)
               print(f"{Fore.GREEN}Deleted remote file: {Fore.YELLOW}/miniatures/{item}")
           except Exception as e:
               print(f"{Fore.RED}Failed to delete: /miniatures/{item} - {str(e)}")

   if 'assets' in files:
       try:
           ftps.cwd('assets')
           for item in ftps.nlst():
               if item not in ('.', '..'):
                   ftps.delete(item)
                   print(f"{Fore.GREEN}Deleted remote file: {Fore.YELLOW}/miniatures/assets/{item}")
           ftps.cwd('/miniatures/')
           ftps.rmd('assets')
           print(f"{Fore.GREEN}Deleted remote folder: {Fore.YELLOW}/miniatures/assets/")
       except Exception as e:
           print(f"{Fore.RED}Error cleaning assets folder: {str(e)}")
           ftps.cwd('/miniatures/')

   verify_miniatures_dir(ftps)
   if include_images and 'images' in files:
       try:
           ftps.cwd('images')
           for item in ftps.nlst():
               if item not in ('.', '..'):
                   ftps.delete(item)
                   print(f"{Fore.GREEN}Deleted remote file: {Fore.YELLOW}/miniatures/images/{item}")
           ftps.cwd('/miniatures/')
           ftps.rmd('images')
           print(f"{Fore.GREEN}Deleted remote folder: {Fore.YELLOW}/miniatures/images/")
       except Exception as e:
           print(f"{Fore.RED}Error cleaning images folder: {str(e)}")
           ftps.cwd('/miniatures/')

   verify_miniatures_dir(ftps)

def upload_files(ftps, local_dir, include_images=False):
   verify_miniatures_dir(ftps)
   print(f"{Fore.CYAN}Uploading files...")
   
   for item in os.listdir(local_dir):
       local_path = os.path.join(local_dir, item)
       if os.path.isfile(local_path):
           try:
               with open(local_path, 'rb') as f:
                   ftps.storbinary(f'STOR {item}', f)
               print(f"{Fore.GREEN}Uploaded: {Fore.YELLOW}{local_path} -> /miniatures/{item}")
           except Exception as e:
               print(f"{Fore.RED}Failed to upload: {local_path} - {str(e)}")
   
   verify_miniatures_dir(ftps)
   assets_dir = os.path.join(local_dir, 'assets')
   if os.path.exists(assets_dir):
       try:
           ftps.mkd('assets')
       except:
           pass
       ftps.cwd('assets')
       
       for item in os.listdir(assets_dir):
           local_path = os.path.join(assets_dir, item)
           try:
               with open(local_path, 'rb') as f:
                   ftps.storbinary(f'STOR {item}', f)
               print(f"{Fore.GREEN}Uploaded: {Fore.YELLOW}{local_path} -> /miniatures/assets/{item}")
           except Exception as e:
               print(f"{Fore.RED}Failed to upload: {local_path} - {str(e)}")
       
       ftps.cwd('/miniatures/')
   
   verify_miniatures_dir(ftps)
   if include_images:
       images_dir = os.path.join(local_dir, 'images')
       if os.path.exists(images_dir):
           try:
               ftps.mkd('images')
           except:
               pass
           ftps.cwd('images')
           
           for item in os.listdir(images_dir):
               local_path = os.path.join(images_dir, item)
               try:
                   with open(local_path, 'rb') as f:
                       ftps.storbinary(f'STOR {item}', f)
                   print(f"{Fore.GREEN}Uploaded: {Fore.YELLOW}{local_path} -> /miniatures/images/{item}")
               except Exception as e:
                   print(f"{Fore.RED}Failed to upload: {local_path} - {str(e)}")
           
           ftps.cwd('/miniatures/')
   
   verify_miniatures_dir(ftps)

def main():
   parser = argparse.ArgumentParser()
   parser.add_argument('--images', action='store_true')
   parser.add_argument('--backup', action='store_true')
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
