import sys
import json
import psycopg2
import psycopg2.extras

DUMP_PATH = '/tmp/backup.sql'
BOT_ID = '157'
BOT_USERNAME = 'omatradingmmbot'

DB_CONFIG = {
    'host': 'localhost',
    'database': 'telegram_market',
    'user': 'postgres',
    'password': 'merikolenndb',
    'port': 5432
}

def parse_dump():
    with open(DUMP_PATH, 'r', encoding='utf-8', errors='ignore') as f:
        lines = f.readlines()

    tables_data = {}
    current_table = None
    current_cols = []

    for line in lines:
        line_str = line.strip('\r\n')
        if line_str.startswith('COPY public.'):
            match = line_str.split('COPY public.')[1]
            table_part, rest = match.split(' (', 1)
            cols_part = rest.split(') FROM stdin;')[0]
            current_table = table_part.strip()
            current_cols = [c.strip() for c in cols_part.split(',')]
            tables_data[current_table] = {'cols': current_cols, 'rows': []}
        elif line_str == '\\.' and current_table:
            current_table = None
        elif current_table:
            parts = line_str.split('\t')
            tables_data[current_table]['rows'].append(parts)

    wc_cols = tables_data.get('website_customers', {}).get('cols', [])
    wc_rows = tables_data.get('website_customers', {}).get('rows', [])
    wc_id_idx = wc_cols.index('id') if 'id' in wc_cols else -1
    wc_bot_idx = wc_cols.index('bot_id') if 'bot_id' in wc_cols else -1
    wc_ids = set()
    if wc_id_idx != -1 and wc_bot_idx != -1:
        for r in wc_rows:
            if len(r) > wc_bot_idx and r[wc_bot_idx] == BOT_ID:
                wc_ids.add(r[wc_id_idx])

    prod_cols = tables_data.get('products', {}).get('cols', [])
    prod_rows = tables_data.get('products', {}).get('rows', [])
    prod_id_idx = prod_cols.index('id') if 'id' in prod_cols else -1
    prod_bot_idx = prod_cols.index('bot_id') if 'bot_id' in prod_cols else -1
    prod_ids = set()
    if prod_id_idx != -1 and prod_bot_idx != -1:
        for r in prod_rows:
            if len(r) > prod_bot_idx and r[prod_bot_idx] == BOT_ID:
                prod_ids.add(r[prod_id_idx])

    extracted = {}

    for table, data in tables_data.items():
        cols = data['cols']
        rows = data['rows']
        
        bot_idx = cols.index('bot_id') if 'bot_id' in cols else -1
        id_idx = cols.index('id') if table == 'managed_bots' and 'id' in cols else -1
        cust_idx = cols.index('customer_id') if 'customer_id' in cols else -1
        prod_idx = cols.index('product_id') if 'product_id' in cols else -1
        username_idx = cols.index('bot_username') if 'bot_username' in cols else -1
        
        matched_rows = []
        for r in rows:
            is_match = False
            if id_idx != -1 and len(r) > id_idx and r[id_idx] == BOT_ID:
                is_match = True
            elif bot_idx != -1 and len(r) > bot_idx and r[bot_idx] == BOT_ID:
                is_match = True
            elif username_idx != -1 and len(r) > username_idx and r[username_idx] == BOT_USERNAME:
                is_match = True
            elif cust_idx != -1 and len(r) > cust_idx and r[cust_idx] in wc_ids:
                is_match = True
            elif prod_idx != -1 and len(r) > prod_idx and r[prod_idx] in prod_ids:
                is_match = True
            elif table == 'users' and 'bot_id' in cols and len(r) > cols.index('bot_id') and r[cols.index('bot_id')] == BOT_ID:
                is_match = True
                
            if is_match:
                matched_rows.append(r)
                
        if matched_rows:
            extracted[table] = (cols, matched_rows)

    return extracted

def restore():
    extracted = parse_dump()
    conn = psycopg2.connect(**DB_CONFIG)
    conn.autocommit = True
    cur = conn.cursor()

    order_of_insertion = [
        'managed_bots',
        'categories',
        'products',
        'website_customers',
        'customer_profiles',
        'customer_accounts_v2',
        'users',
        'orders',
        'payment_methods',
        'content_blocks',
        'bot_ai_settings',
        'bot_sheet_sync',
        'admin_promotion_keys',
        'plan_orders',
        'qr_customer_cart',
        'qr_customer_orders',
        'qr_points_transactions'
    ]

    total_restored = 0

    for table in order_of_insertion:
        if table not in extracted:
            continue

        cols, rows = extracted[table]
        
        cur.execute("SELECT column_name, data_type FROM information_schema.columns WHERE table_name=%s AND table_schema='public';", (table,))
        col_info = {r[0]: r[1] for r in cur.fetchall()}
        
        valid_indices = [i for i, c in enumerate(cols) if c in col_info]
        target_cols = [cols[i] for i in valid_indices]

        inserted_count = 0
        for r in rows:
            try:
                params = []
                for i in valid_indices:
                    col_name = cols[i]
                    col_type = col_info[col_name]
                    val = r[i]
                    if val == '\\N':
                        params.append(None)
                    elif col_type in ('json', 'jsonb'):
                        try:
                            # Clean string for Postgres JSON parser
                            cleaned = val.replace('\\\\', '\\').replace('\\"', '"')
                            params.append(json.dumps(json.loads(cleaned)))
                        except Exception:
                            try:
                                params.append(json.dumps(json.loads(val)))
                            except Exception:
                                params.append(None)
                    else:
                        params.append(val)

                cols_sql = ", ".join([f'"{c}"' for c in target_cols])
                placeholders = ", ".join(["%s"] * len(target_cols))
                
                sql = f'INSERT INTO "{table}" ({cols_sql}) VALUES ({placeholders}) ON CONFLICT DO NOTHING;'
                cur.execute(sql, params)
                if cur.rowcount > 0:
                    inserted_count += 1
            except Exception as row_err:
                print(f"  Warning row skip in {table}: {row_err}")

        total_restored += inserted_count
        print(f"Restored {table:<32} -> {inserted_count}/{len(rows)} records inserted")

    for table in order_of_insertion:
        try:
            cur.execute(f"SELECT setval(pg_get_serial_sequence('{table}', 'id'), COALESCE((SELECT MAX(id) FROM {table}), 1), true);")
        except Exception:
            pass

    print(f"\nRESTORE COMPLETED SUCCESSFULLY! Total records restored: {total_restored}")

    cur.close()
    conn.close()

if __name__ == '__main__':
    restore()
