from dotenv import load_dotenv # type: ignore
import os
from supabase import create_client # type: ignore
from datetime import datetime

def read_credentials():
    load_dotenv('../.env')
    return {
        'ftp_user': os.getenv('FTP_USER'),
        'ftp_pass': os.getenv('FTP_PASS'),
        'supabase_url': os.getenv('VITE_SUPABASE_URL'),
        'supabase_key': os.getenv('VITE_SUPABASE_ANON_KEY')
    }

def format_sql_value(v):
    if isinstance(v, (str, datetime)):
        # Use double quotes to avoid escaping issues
        escaped = str(v).replace("'", "''")
        return f"'{escaped}'"
    if v is None:
        return 'NULL'
    return str(v)

def get_schema_sql(supabase, table):
    query = f"""
    SELECT 
        'CREATE TABLE ' || quote_ident('{table}') || ' (' ||
        string_agg(
            quote_ident(column_name) || ' ' || 
            data_type || 
            CASE 
                WHEN character_maximum_length IS NOT NULL 
                THEN '(' || character_maximum_length || ')'
                ELSE ''
            END || 
            CASE 
                WHEN column_default IS NOT NULL 
                THEN ' DEFAULT ' || column_default
                ELSE ''
            END ||
            CASE 
                WHEN is_nullable = 'NO' 
                THEN ' NOT NULL'
                ELSE ''
            END,
            ', '
        ) || ')' as create_stmt,
        string_agg(
            CASE 
                WHEN column_default IS NOT NULL 
                THEN 'ALTER TABLE ' || quote_ident('{table}') || 
                     ' ALTER COLUMN ' || quote_ident(column_name) || 
                     ' SET DEFAULT ' || column_default
                ELSE ''
            END,
            E'\n'
        ) as alter_stmts
    FROM information_schema.columns 
    WHERE table_name = '{table}' 
    GROUP BY table_name
    """
    
    result = supabase.rpc('exec_sql', {
        'query': query,
        'table_name': table
    }).execute()
    
    if not result.data:
        raise Exception(f"No schema information found for table {table}")
        
    # Add the semicolons back in the returned string
    return f"{result.data[0]['create_stmt']};\n{result.data[0]['alter_stmts']};"

def main():
    creds = read_credentials()
    supabase = create_client(creds['supabase_url'], creds['supabase_key'])

    tables = [
        'base_sizes', 'mini_categories', 'mini_to_tags', 'mini_to_types',
        'mini_types', 'minis', 'painted_by', 'product_companies',
        'product_lines', 'product_sets', 'profiles', 'settings',
        'tags', 'type_to_categories', 'user_settings'
    ]

    backup_file = f"backup_{datetime.now().strftime('%Y%m%d_%H%M%S')}.sql"

    with open(backup_file, 'w') as f:
        # Write header
        f.write("-- Backup created at " + datetime.now().strftime('%Y-%m-%d %H:%M:%S') + "\n\n")
        f.write("BEGIN;\n\n")

        # Drop existing tables in reverse order (for foreign keys)
        f.write("-- Drop existing tables\n")
        for table in reversed(tables):
            f.write(f"DROP TABLE IF EXISTS {table} CASCADE;\n")
        f.write("\n")

        # Create tables and constraints
        f.write("-- Create tables and constraints\n")
        for table in tables:
            schema_sql = get_schema_sql(supabase, table)
            f.write(f"{schema_sql}\n\n")

        # Insert data
        f.write("-- Insert data\n")
        for table in tables:
            data = supabase.table(table).select('*').execute()
            if data.data:
                f.write(f"\n-- Data for {table}\n")
                for row in data.data:
                    columns = ', '.join(row.keys())
                    values = ', '.join(
                        format_sql_value(v) for v in row.values()
                    )
                    f.write(f"INSERT INTO {table} ({columns}) VALUES ({values});\n")

        f.write("\nCOMMIT;\n")

    print(f"Backup created: {backup_file}")

if __name__ == "__main__":
    main()
