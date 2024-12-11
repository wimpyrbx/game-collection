BEGIN TRANSACTION;
CREATE TABLE IF NOT EXISTS "product_groups" (
	"id"	INTEGER,
	"name"	TEXT NOT NULL CHECK(length("name") > 0) UNIQUE,
	"description"	TEXT,
	"is_active"	BOOLEAN NOT NULL DEFAULT 1,
	"created_at"	DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
	"updated_at"	DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
	PRIMARY KEY("id" AUTOINCREMENT)
);
CREATE TABLE IF NOT EXISTS "product_types" (
	"id"	INTEGER,
	"name"	TEXT NOT NULL CHECK(length("name") > 0) UNIQUE,
	"description"	TEXT,
	"is_active"	BOOLEAN NOT NULL DEFAULT 1,
	"created_at"	DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
	"updated_at"	DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
	PRIMARY KEY("id" AUTOINCREMENT)
);
CREATE TABLE IF NOT EXISTS "regions" (
	"id"	INTEGER,
	"name"	TEXT NOT NULL CHECK(length("name") > 0) UNIQUE,
	"description"	TEXT,
	"is_active"	BOOLEAN NOT NULL DEFAULT 1,
	"created_at"	DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
	"updated_at"	DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
	PRIMARY KEY("id" AUTOINCREMENT)
);
CREATE TABLE IF NOT EXISTS "rating_groups" (
	"id"	INTEGER,
	"region_id"	INTEGER NOT NULL,
	"name"	TEXT NOT NULL CHECK(length("name") > 0),
	"description"	TEXT,
	"is_active"	BOOLEAN NOT NULL DEFAULT 1,
	"created_at"	DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
	"updated_at"	DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY("region_id") REFERENCES "regions"("id") ON DELETE RESTRICT,
	PRIMARY KEY("id" AUTOINCREMENT),
	UNIQUE("region_id","name")
);
CREATE TABLE IF NOT EXISTS "ratings" (
	"id"	INTEGER,
	"rating_group_id"	INTEGER NOT NULL,
	"name"	TEXT NOT NULL CHECK(length("name") > 0),
	"minimum_age"	INTEGER,
	"description"	TEXT,
	"is_active"	BOOLEAN NOT NULL DEFAULT 1,
	"created_at"	DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
	"updated_at"	DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY("rating_group_id") REFERENCES "rating_groups"("id") ON DELETE RESTRICT,
	PRIMARY KEY("id" AUTOINCREMENT),
	UNIQUE("rating_group_id","name")
);
CREATE TABLE IF NOT EXISTS "products" (
	"id"	INTEGER,
	"product_group_id"	INTEGER NOT NULL,
	"product_type_id"	INTEGER NOT NULL,
	"region_id"	INTEGER NOT NULL,
	"rating_id"	INTEGER,
	"pricecharting_id"	INTEGER,
	"title"	TEXT NOT NULL CHECK(length("title") > 0),
	"variant"	TEXT,
	"release_year"	INTEGER CHECK("release_year" BETWEEN 1950 AND 2050),
	"description"	TEXT,
	"is_active"	BOOLEAN NOT NULL DEFAULT 1,
	"created_at"	DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
	"updated_at"	DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY("region_id") REFERENCES "regions"("id") ON DELETE RESTRICT,
	FOREIGN KEY("product_type_id") REFERENCES "product_types"("id") ON DELETE RESTRICT,
	FOREIGN KEY("product_group_id") REFERENCES "product_groups"("id") ON DELETE RESTRICT,
	FOREIGN KEY("rating_id") REFERENCES "ratings"("id") ON DELETE RESTRICT,
	PRIMARY KEY("id" AUTOINCREMENT),
	UNIQUE("title","variant","product_group_id","region_id")
);
CREATE TABLE IF NOT EXISTS "inventory" (
	"id"	INTEGER,
	"product_id"	INTEGER NOT NULL,
	"barcode"	TEXT CHECK("barcode" IS NULL OR length("barcode") > 0),
	"price_override"	REAL CHECK("price_override" IS NULL OR "price_override" >= 0),
	"comment"	TEXT CHECK("comment" IS NULL OR length("comment") > 0),
	"is_active"	BOOLEAN NOT NULL DEFAULT 1,
	"created_at"	DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
	"updated_at"	DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY("product_id") REFERENCES "products"("id") ON DELETE RESTRICT,
	PRIMARY KEY("id" AUTOINCREMENT),
	UNIQUE("barcode")
);
CREATE TABLE IF NOT EXISTS "product_attribute_values" (
	"id"	INTEGER,
	"product_id"	INTEGER NOT NULL,
	"attribute_id"	INTEGER NOT NULL,
	"value"	TEXT NOT NULL,
	"created_at"	DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
	"updated_at"	DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY("attribute_id") REFERENCES "attributes"("id") ON DELETE RESTRICT,
	FOREIGN KEY("product_id") REFERENCES "products"("id") ON DELETE RESTRICT,
	PRIMARY KEY("id" AUTOINCREMENT),
	UNIQUE("product_id","attribute_id")
);
CREATE TABLE IF NOT EXISTS "inventory_attribute_values" (
	"id"	INTEGER,
	"inventory_id"	INTEGER NOT NULL,
	"attribute_id"	INTEGER NOT NULL,
	"value"	TEXT NOT NULL,
	"created_at"	DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
	"updated_at"	DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY("inventory_id") REFERENCES "inventory"("id") ON DELETE RESTRICT,
	FOREIGN KEY("attribute_id") REFERENCES "attributes"("id") ON DELETE RESTRICT,
	PRIMARY KEY("id" AUTOINCREMENT),
	UNIQUE("inventory_id","attribute_id")
);
CREATE TABLE IF NOT EXISTS "pricecharting_prices" (
	"id"	INTEGER,
	"product_id"	INTEGER NOT NULL,
	"loose_usd"	REAL CHECK("loose_usd" IS NULL OR "loose_usd" >= 0),
	"cib_usd"	REAL CHECK("cib_usd" IS NULL OR "cib_usd" >= 0),
	"new_usd"	REAL CHECK("new_usd" IS NULL OR "new_usd" >= 0),
	"manual_only_usd"	REAL CHECK("manual_only_usd" IS NULL OR "manual_only_usd" >= 0),
	"box_only_usd"	REAL CHECK("box_only_usd" IS NULL OR "box_only_usd" >= 0),
	"loose_nok"	REAL CHECK("loose_nok" IS NULL OR "loose_nok" >= 0),
	"cib_nok"	REAL CHECK("cib_nok" IS NULL OR "cib_nok" >= 0),
	"new_nok"	REAL CHECK("new_nok" IS NULL OR "new_nok" >= 0),
	"manual_only_nok"	REAL CHECK("manual_only_nok" IS NULL OR "manual_only_nok" >= 0),
	"box_only_nok"	REAL CHECK("box_only_nok" IS NULL OR "box_only_nok" >= 0),
	"loose_nok_fixed"	REAL CHECK("loose_nok_fixed" IS NULL OR "loose_nok_fixed" >= 0),
	"cib_nok_fixed"	REAL CHECK("cib_nok_fixed" IS NULL OR "cib_nok_fixed" >= 0),
	"new_nok_fixed"	REAL CHECK("new_nok_fixed" IS NULL OR "new_nok_fixed" >= 0),
	"manual_only_nok_fixed"	REAL CHECK("manual_only_nok_fixed" IS NULL OR "manual_only_nok_fixed" >= 0),
	"box_only_nok_fixed"	REAL CHECK("box_only_nok_fixed" IS NULL OR "box_only_nok_fixed" >= 0),
	"usd_nok_rate"	REAL NOT NULL CHECK("usd_nok_rate" > 0),
	"is_active"	BOOLEAN NOT NULL DEFAULT 1,
	"created_at"	DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
	"updated_at"	DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY("product_id") REFERENCES "products"("id") ON DELETE RESTRICT,
	PRIMARY KEY("id" AUTOINCREMENT)
);
CREATE TABLE IF NOT EXISTS "product_sites" (
	"id"	INTEGER,
	"name"	TEXT NOT NULL CHECK(length("name") > 0) UNIQUE,
	"base_url"	TEXT NOT NULL CHECK(length("base_url") > 0 AND "base_url" LIKE 'http%://%'),
	"description"	TEXT,
	"is_active"	BOOLEAN NOT NULL DEFAULT 1,
	"created_at"	DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
	"updated_at"	DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
	PRIMARY KEY("id" AUTOINCREMENT)
);
CREATE TABLE IF NOT EXISTS "product_site_links" (
	"id"	INTEGER,
	"product_id"	INTEGER NOT NULL,
	"site_id"	INTEGER NOT NULL,
	"url_path"	TEXT NOT NULL CHECK(length("url_path") > 0),
	"is_active"	BOOLEAN NOT NULL DEFAULT 1,
	"created_at"	DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
	"updated_at"	DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY("product_id") REFERENCES "products"("id") ON DELETE RESTRICT,
	FOREIGN KEY("site_id") REFERENCES "product_sites"("id") ON DELETE RESTRICT,
	UNIQUE("product_id","site_id"),
	PRIMARY KEY("id" AUTOINCREMENT)
);
CREATE TABLE IF NOT EXISTS "attributes" (
	"id"	INTEGER,
	"name"	TEXT NOT NULL CHECK(length("name") > 0) UNIQUE,
	"ui_name"	TEXT NOT NULL CHECK(length("ui_name") > 0),
	"type"	TEXT NOT NULL CHECK("type" IN ('boolean', 'string', 'number', 'set')),
	"scope"	TEXT NOT NULL CHECK("scope" IN ('product', 'inventory')),
	"allowed_values"	TEXT,
	"product_type_ids"	TEXT,
	"product_group_ids"	TEXT,
	"is_required"	BOOLEAN NOT NULL DEFAULT 0,
	"default_value"	TEXT,
	"description"	TEXT,
	"is_active"	BOOLEAN NOT NULL DEFAULT 1,
	"created_at"	DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
	"updated_at"	DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
	"show_in_ui"	BOOLEAN NOT NULL DEFAULT 1,
	"show_if_empty"	BOOLEAN NOT NULL DEFAULT 0,
	"use_image"	BOOLEAN NOT NULL DEFAULT 0,
	PRIMARY KEY("id" AUTOINCREMENT)
);
CREATE TABLE IF NOT EXISTS "users" (
	"id"	INTEGER,
	"username"	TEXT NOT NULL UNIQUE,
	"password"	TEXT NOT NULL,
	"created_at"	DATETIME DEFAULT CURRENT_TIMESTAMP,
	PRIMARY KEY("id" AUTOINCREMENT)
);
INSERT INTO "product_groups" VALUES (1,'Xbox 360','Microsoft Xbox 360 gaming console and related items',1,'2024-11-23 13:26:58','2024-11-23 13:26:58');
INSERT INTO "product_groups" VALUES (2,'PlayStation 3','Sony Playstation 3 gaming console and related items',1,'2024-11-23 13:26:58','2024-11-29 01:44:42');
INSERT INTO "product_groups" VALUES (3,'PlayStation 4','Sony PlayStation 4 gaming console and related items',1,'2024-11-23 13:26:58','2024-11-23 13:26:58');
INSERT INTO "product_groups" VALUES (4,'Nintendo Wii','Nintendo Wii gaming console and related items',1,'2024-11-23 13:26:58','2024-11-23 13:26:58');
INSERT INTO "product_groups" VALUES (5,'Nintendo Wii U','Nintendo Wii U gaming console and related items',1,'2024-11-23 13:26:58','2024-11-23 13:26:58');
INSERT INTO "product_types" VALUES (1,'Game',NULL,1,'2024-11-23 13:26:58','2024-11-23 13:26:58');
INSERT INTO "product_types" VALUES (3,'Console',NULL,1,'2024-11-23 13:26:58','2024-11-23 13:26:58');
INSERT INTO "product_types" VALUES (7,'Peripherals',NULL,1,'2024-11-30 00:48:56','2024-11-30 00:48:56');
INSERT INTO "regions" VALUES (1,'PAL',NULL,1,'2024-11-23 13:26:58','2024-11-23 13:26:58');
INSERT INTO "regions" VALUES (2,'NTSC',NULL,1,'2024-11-23 13:26:58','2024-11-23 13:26:58');
INSERT INTO "regions" VALUES (3,'NTSC-J',NULL,1,'2024-11-23 13:26:58','2024-11-23 13:26:58');
INSERT INTO "rating_groups" VALUES (1,1,'PEGI',NULL,1,'2024-11-23 13:26:58','2024-11-23 13:26:58');
INSERT INTO "rating_groups" VALUES (2,2,'ESRB',NULL,1,'2024-11-23 13:26:58','2024-11-29 01:35:36');
INSERT INTO "rating_groups" VALUES (3,1,'USK',NULL,1,'2024-11-23 13:26:58','2024-11-23 13:26:58');
INSERT INTO "rating_groups" VALUES (4,1,'ACB',NULL,1,'2024-11-23 13:26:58','2024-11-23 13:26:58');
INSERT INTO "rating_groups" VALUES (5,1,'BBFC',NULL,1,'2024-11-23 13:26:58','2024-11-23 13:26:58');
INSERT INTO "rating_groups" VALUES (6,3,'CERO',NULL,1,'2024-11-23 13:26:58','2024-11-23 13:26:58');
INSERT INTO "ratings" VALUES (1,1,'PEGI 3',3,NULL,1,'2024-11-23 13:26:58','2024-11-23 13:26:58');
INSERT INTO "ratings" VALUES (3,1,'PEGI 12',12,NULL,1,'2024-11-23 13:26:58','2024-11-23 13:26:58');
INSERT INTO "ratings" VALUES (4,1,'PEGI 16',16,NULL,1,'2024-11-23 13:26:58','2024-11-23 13:26:58');
INSERT INTO "ratings" VALUES (5,1,'PEGI 18',18,NULL,1,'2024-11-23 13:26:58','2024-11-23 13:26:58');
INSERT INTO "ratings" VALUES (6,6,'CERO A',0,NULL,1,'2024-11-23 13:26:58','2024-11-23 13:26:58');
INSERT INTO "ratings" VALUES (7,6,'CERO B',12,NULL,1,'2024-11-23 13:26:58','2024-11-23 13:26:58');
INSERT INTO "ratings" VALUES (8,6,'CERO C',15,NULL,1,'2024-11-23 13:26:58','2024-11-23 13:26:58');
INSERT INTO "ratings" VALUES (9,6,'CERO D',17,NULL,1,'2024-11-23 13:26:58','2024-11-23 13:26:58');
INSERT INTO "ratings" VALUES (10,6,'CERO Z',18,NULL,1,'2024-11-23 13:26:58','2024-11-23 13:26:58');
INSERT INTO "ratings" VALUES (11,4,'ACB G',0,NULL,1,'2024-11-23 13:26:58','2024-11-23 13:26:58');
INSERT INTO "ratings" VALUES (12,4,'ACB M',15,NULL,1,'2024-11-23 13:26:58','2024-11-23 13:26:58');
INSERT INTO "ratings" VALUES (13,4,'ACB M15',15,NULL,1,'2024-11-23 13:26:58','2024-11-23 13:26:58');
INSERT INTO "ratings" VALUES (14,4,'ACB PG',0,NULL,1,'2024-11-23 13:26:58','2024-11-23 13:26:58');
INSERT INTO "ratings" VALUES (15,4,'ACB R18',18,NULL,1,'2024-11-23 13:26:58','2024-11-23 13:26:58');
INSERT INTO "ratings" VALUES (16,5,'BBFC 12e',12,NULL,1,'2024-11-23 13:26:58','2024-11-29 01:33:25');
INSERT INTO "ratings" VALUES (17,5,'BBFC 15',15,NULL,1,'2024-11-23 13:26:58','2024-11-23 13:26:58');
INSERT INTO "ratings" VALUES (18,5,'BBFC 18',18,NULL,1,'2024-11-23 13:26:58','2024-11-23 13:26:58');
INSERT INTO "ratings" VALUES (19,5,'BBFC PG',0,NULL,1,'2024-11-23 13:26:58','2024-11-23 13:26:58');
INSERT INTO "ratings" VALUES (20,5,'BBFC U',0,NULL,1,'2024-11-23 13:26:58','2024-11-23 13:26:58');
INSERT INTO "ratings" VALUES (24,2,'ESRB T',13,NULL,1,'2024-11-23 13:26:58','2024-11-23 13:26:58');
INSERT INTO "ratings" VALUES (26,3,'USK 0',0,NULL,1,'2024-11-23 13:26:58','2024-11-23 13:26:58');
INSERT INTO "ratings" VALUES (27,3,'USK 6',6,NULL,1,'2024-11-23 13:26:58','2024-11-23 13:26:58');
INSERT INTO "ratings" VALUES (28,3,'USK 12',12,NULL,1,'2024-11-23 13:26:58','2024-11-23 13:26:58');
INSERT INTO "ratings" VALUES (29,3,'USK 16',16,NULL,1,'2024-11-23 13:26:58','2024-11-23 13:26:58');
INSERT INTO "ratings" VALUES (30,3,'USK 18',18,NULL,1,'2024-11-23 13:26:58','2024-11-23 13:26:58');
INSERT INTO "ratings" VALUES (31,2,'ESRB Ed',NULL,NULL,1,'2024-11-29 01:31:43','2024-11-29 01:35:40');
INSERT INTO "ratings" VALUES (32,2,'ESRB EC',NULL,NULL,1,'2024-11-29 01:31:49','2024-11-29 01:31:49');
INSERT INTO "ratings" VALUES (33,2,'ESRB E10',NULL,NULL,1,'2024-11-29 01:31:55','2024-11-29 01:37:23');
INSERT INTO "ratings" VALUES (34,2,'ESRB M',NULL,NULL,1,'2024-11-29 01:32:01','2024-11-29 01:32:01');
INSERT INTO "ratings" VALUES (35,1,'PEGI 7',NULL,NULL,1,'2024-11-29 01:32:37','2024-11-29 01:32:37');
INSERT INTO "products" VALUES (1,1,1,1,5,NULL,'Assassin''s Creed',NULL,2009,'a',1,'2024-11-30 12:35:17','2024-11-30 13:41:28');
INSERT INTO "product_attribute_values" VALUES (25,1,46,'dd','2024-11-30 13:41:28','2024-11-30 13:41:28');
INSERT INTO "product_attribute_values" VALUES (26,1,47,'pp','2024-11-30 13:41:28','2024-11-30 13:41:28');
INSERT INTO "product_attribute_values" VALUES (27,1,48,'1','2024-11-30 13:41:28','2024-11-30 13:41:28');
INSERT INTO "product_attribute_values" VALUES (28,1,49,'gg','2024-11-30 13:41:28','2024-11-30 13:41:28');
INSERT INTO "product_sites" VALUES (1,'PriceCharting','https://www.pricecharting.com','Video game price tracking website',1,'2024-11-23 13:26:58','2024-11-23 13:26:58');
INSERT INTO "product_sites" VALUES (2,'MobyGames','https://www.mobygames.com','Video game database',1,'2024-11-23 13:26:58','2024-11-23 13:26:58');
INSERT INTO "product_sites" VALUES (3,'GameFAQs','https://gamefaqs.gamespot.com','Video game guides and community',1,'2024-11-23 13:26:58','2024-11-23 13:26:58');
INSERT INTO "attributes" VALUES (46,'developerName','Developer','string','product','','[1]','[4,5,2,3,1]',0,'',NULL,1,'2024-11-29 13:16:25','2024-11-29 13:16:25',1,0,0);
INSERT INTO "attributes" VALUES (47,'publisherName','Publisher','string','product','','[1]','[4,5,2,3,1]',0,'',NULL,1,'2024-11-29 13:16:40','2024-11-29 13:16:40',1,0,0);
INSERT INTO "attributes" VALUES (48,'isKinect','Kinect','boolean','product','','[1]','[1]',1,'0',NULL,1,'2024-11-29 13:17:06','2024-11-29 23:59:12',1,0,0);
INSERT INTO "attributes" VALUES (49,'gameGenre','Genre','string','product','','[1]','[4,5,2,3,1]',1,'',NULL,1,'2024-11-29 13:17:37','2024-11-29 14:11:35',1,0,0);
INSERT INTO "users" VALUES (1,'ltg','$2b$10$kllPpEdLlvn9nAT4Otb7qO3D9eJ7yWnvAFRDNi6NN.DmZqBeAr4hq','2024-11-30 04:15:14');
INSERT INTO "users" VALUES (2,'guyra','$2b$10$US79s0yn2Wl5Hd5QuwIM1OwpyA.dUr16SedvlCHa7NxEu5OHcDb1a','2024-11-30 04:15:14');
CREATE INDEX IF NOT EXISTS "idx_product_groups_active" ON "product_groups" (
	"is_active"
);
CREATE INDEX IF NOT EXISTS "idx_product_types_active" ON "product_types" (
	"is_active"
);
CREATE INDEX IF NOT EXISTS "idx_regions_active" ON "regions" (
	"is_active"
);
CREATE INDEX IF NOT EXISTS "idx_rating_groups_region" ON "rating_groups" (
	"region_id"
);
CREATE INDEX IF NOT EXISTS "idx_rating_groups_active" ON "rating_groups" (
	"is_active"
);
CREATE INDEX IF NOT EXISTS "idx_ratings_group" ON "ratings" (
	"rating_group_id"
);
CREATE INDEX IF NOT EXISTS "idx_ratings_active" ON "ratings" (
	"is_active"
);
CREATE INDEX IF NOT EXISTS "idx_products_group" ON "products" (
	"product_group_id"
);
CREATE INDEX IF NOT EXISTS "idx_products_type" ON "products" (
	"product_type_id"
);
CREATE INDEX IF NOT EXISTS "idx_products_region" ON "products" (
	"region_id"
);
CREATE INDEX IF NOT EXISTS "idx_products_rating" ON "products" (
	"rating_id"
);
CREATE INDEX IF NOT EXISTS "idx_products_pricecharting" ON "products" (
	"pricecharting_id"
);
CREATE INDEX IF NOT EXISTS "idx_products_active" ON "products" (
	"is_active"
);
CREATE INDEX IF NOT EXISTS "idx_products_title" ON "products" (
	"title"
);
CREATE INDEX IF NOT EXISTS "idx_products_release_year" ON "products" (
	"release_year"
);
CREATE INDEX IF NOT EXISTS "idx_inventory_product" ON "inventory" (
	"product_id"
);
CREATE INDEX IF NOT EXISTS "idx_inventory_active" ON "inventory" (
	"is_active"
);
CREATE INDEX IF NOT EXISTS "idx_inventory_barcode" ON "inventory" (
	"barcode"
);
CREATE INDEX IF NOT EXISTS "idx_product_attribute_values_product" ON "product_attribute_values" (
	"product_id"
);
CREATE INDEX IF NOT EXISTS "idx_product_attribute_values_attribute" ON "product_attribute_values" (
	"attribute_id"
);
CREATE INDEX IF NOT EXISTS "idx_inventory_attribute_values_inventory" ON "inventory_attribute_values" (
	"inventory_id"
);
CREATE INDEX IF NOT EXISTS "idx_inventory_attribute_values_attribute" ON "inventory_attribute_values" (
	"attribute_id"
);
CREATE INDEX IF NOT EXISTS "idx_pricecharting_prices_product" ON "pricecharting_prices" (
	"product_id"
);
CREATE INDEX IF NOT EXISTS "idx_pricecharting_prices_active" ON "pricecharting_prices" (
	"is_active"
);
CREATE INDEX IF NOT EXISTS "idx_product_sites_active" ON "product_sites" (
	"is_active"
);
CREATE INDEX IF NOT EXISTS "idx_product_site_links_product" ON "product_site_links" (
	"product_id"
);
CREATE INDEX IF NOT EXISTS "idx_product_site_links_site" ON "product_site_links" (
	"site_id"
);
CREATE INDEX IF NOT EXISTS "idx_product_site_links_active" ON "product_site_links" (
	"is_active"
);
CREATE INDEX IF NOT EXISTS "idx_attributes_type" ON "attributes" (
	"type"
);
CREATE INDEX IF NOT EXISTS "idx_attributes_scope" ON "attributes" (
	"scope"
);
CREATE INDEX IF NOT EXISTS "idx_attributes_active" ON "attributes" (
	"is_active"
);
CREATE TRIGGER update_product_groups_timestamp 
   AFTER UPDATE ON product_groups
BEGIN
   UPDATE product_groups SET updated_at = CURRENT_TIMESTAMP
   WHERE id = NEW.id;
END;
CREATE TRIGGER update_product_types_timestamp 
   AFTER UPDATE ON product_types
BEGIN
   UPDATE product_types SET updated_at = CURRENT_TIMESTAMP
   WHERE id = NEW.id;
END;
CREATE TRIGGER update_regions_timestamp 
   AFTER UPDATE ON regions
BEGIN
   UPDATE regions SET updated_at = CURRENT_TIMESTAMP
   WHERE id = NEW.id;
END;
CREATE TRIGGER update_rating_groups_timestamp 
   AFTER UPDATE ON rating_groups
BEGIN
   UPDATE rating_groups SET updated_at = CURRENT_TIMESTAMP
   WHERE id = NEW.id;
END;
CREATE TRIGGER update_ratings_timestamp 
   AFTER UPDATE ON ratings
BEGIN
   UPDATE ratings SET updated_at = CURRENT_TIMESTAMP
   WHERE id = NEW.id;
END;
CREATE TRIGGER update_products_timestamp 
   AFTER UPDATE ON products
BEGIN
   UPDATE products SET updated_at = CURRENT_TIMESTAMP
   WHERE id = NEW.id;
END;
CREATE TRIGGER update_inventory_timestamp 
   AFTER UPDATE ON inventory
BEGIN
   UPDATE inventory SET updated_at = CURRENT_TIMESTAMP
   WHERE id = NEW.id;
END;
CREATE TRIGGER update_product_attribute_values_timestamp 
   AFTER UPDATE ON product_attribute_values
BEGIN
   UPDATE product_attribute_values SET updated_at = CURRENT_TIMESTAMP
   WHERE id = NEW.id;
END;
CREATE TRIGGER update_inventory_attribute_values_timestamp 
   AFTER UPDATE ON inventory_attribute_values
BEGIN
   UPDATE inventory_attribute_values SET updated_at = CURRENT_TIMESTAMP
   WHERE id = NEW.id;
END;
CREATE TRIGGER update_pricecharting_prices_timestamp 
   AFTER UPDATE ON pricecharting_prices
BEGIN
   UPDATE pricecharting_prices SET updated_at = CURRENT_TIMESTAMP
   WHERE id = NEW.id;
END;
CREATE TRIGGER update_product_sites_timestamp 
   AFTER UPDATE ON product_sites
BEGIN
   UPDATE product_sites SET updated_at = CURRENT_TIMESTAMP
   WHERE id = NEW.id;
END;
CREATE TRIGGER update_product_site_links_timestamp 
   AFTER UPDATE ON product_site_links
BEGIN
   UPDATE product_site_links SET updated_at = CURRENT_TIMESTAMP
   WHERE id = NEW.id;
END;
CREATE TRIGGER validate_product_rating_region
   BEFORE INSERT ON products
   WHEN NEW.rating_id IS NOT NULL
BEGIN
   SELECT CASE 
       WHEN NOT EXISTS (
           SELECT 1 FROM ratings r
           JOIN rating_groups rg ON r.rating_group_id = rg.id
           WHERE r.id = NEW.rating_id 
           AND rg.region_id = NEW.region_id
       )
       THEN RAISE(ABORT, 'Rating must belong to the specified region')
   END;
END;
CREATE TRIGGER validate_product_rating_region_update
   BEFORE UPDATE ON products
   WHEN NEW.rating_id IS NOT NULL
BEGIN
   SELECT CASE 
       WHEN NOT EXISTS (
           SELECT 1 FROM ratings r
           JOIN rating_groups rg ON r.rating_group_id = rg.id
           WHERE r.id = NEW.rating_id 
           AND rg.region_id = NEW.region_id
       )
       THEN RAISE(ABORT, 'Rating must belong to the specified region')
   END;
END;
CREATE TRIGGER validate_attribute_value_insert
   BEFORE INSERT ON product_attribute_values
BEGIN
   SELECT CASE
       WHEN (SELECT type FROM attributes WHERE id = NEW.attribute_id) = 'boolean'
           AND NEW.value NOT IN ('0', '1')
           THEN RAISE(ABORT, 'Boolean attribute must be 0 or 1')
           
       WHEN (SELECT type FROM attributes WHERE id = NEW.attribute_id) = 'number'
           AND NOT NEW.value GLOB '[0-9]*[.][0-9]*' 
           AND NOT NEW.value GLOB '[0-9]*'
           THEN RAISE(ABORT, 'Number attribute must be numeric')
           
       WHEN (SELECT type FROM attributes WHERE id = NEW.attribute_id) = 'set'
           AND NOT EXISTS (
               SELECT 1 FROM json_each(
                   (SELECT allowed_values FROM attributes WHERE id = NEW.attribute_id)
               ) 
               WHERE value = NEW.value
           )
           THEN RAISE(ABORT, 'Set attribute value must be one of the allowed values')
   END;
END;
CREATE TRIGGER validate_inventory_attribute_value_insert
   BEFORE INSERT ON inventory_attribute_values
BEGIN
   SELECT CASE
       WHEN (SELECT type FROM attributes WHERE id = NEW.attribute_id) = 'boolean'
           AND NEW.value NOT IN ('0', '1')
           THEN RAISE(ABORT, 'Boolean attribute must be 0 or 1')
           
       WHEN (SELECT type FROM attributes WHERE id = NEW.attribute_id) = 'number'
           AND NOT NEW.value GLOB '[0-9]*[.][0-9]*' 
           AND NOT NEW.value GLOB '[0-9]*'
           THEN RAISE(ABORT, 'Number attribute must be numeric')
           
       WHEN (SELECT type FROM attributes WHERE id = NEW.attribute_id) = 'set'
           AND NOT EXISTS (
               SELECT 1 FROM json_each(
                   (SELECT allowed_values FROM attributes WHERE id = NEW.attribute_id)
               ) 
               WHERE value = NEW.value
           )
           THEN RAISE(ABORT, 'Set attribute value must be one of the allowed values')
   END;
END;
CREATE TRIGGER validate_attribute_scope_product
   BEFORE INSERT ON product_attribute_values
BEGIN
   SELECT CASE
       WHEN (SELECT scope FROM attributes WHERE id = NEW.attribute_id) != 'product'
       THEN RAISE(ABORT, 'This attribute cannot be used for products')
   END;
END;
CREATE TRIGGER validate_attribute_scope_inventory
   BEFORE INSERT ON inventory_attribute_values
BEGIN
   SELECT CASE
       WHEN (SELECT scope FROM attributes WHERE id = NEW.attribute_id) != 'inventory'
       THEN RAISE(ABORT, 'This attribute cannot be used for inventory items')
   END;
END;
CREATE TRIGGER validate_product_attribute_constraints
   BEFORE INSERT ON product_attribute_values
   WHEN (SELECT product_type_ids FROM attributes WHERE id = NEW.attribute_id) IS NOT NULL 
   OR (SELECT product_group_ids FROM attributes WHERE id = NEW.attribute_id) IS NOT NULL
BEGIN
   SELECT CASE
       WHEN (SELECT product_type_ids FROM attributes WHERE id = NEW.attribute_id) IS NOT NULL
       AND NOT EXISTS (
           SELECT 1 FROM products p
           WHERE p.id = NEW.product_id
           AND p.product_type_id IN (
               SELECT value FROM json_each(
                   (SELECT product_type_ids FROM attributes WHERE id = NEW.attribute_id)
               )
           )
       )
       THEN RAISE(ABORT, 'This attribute is not allowed for this product type')
       
       WHEN (SELECT product_group_ids FROM attributes WHERE id = NEW.attribute_id) IS NOT NULL
       AND NOT EXISTS (
           SELECT 1 FROM products p
           WHERE p.id = NEW.product_id
           AND p.product_group_id IN (
               SELECT value FROM json_each(
                   (SELECT product_group_ids FROM attributes WHERE id = NEW.attribute_id)
               )
           )
       )
       THEN RAISE(ABORT, 'This attribute is not allowed for this product group')
   END;
END;
CREATE TRIGGER update_attributes_timestamp 
   AFTER UPDATE ON attributes
BEGIN
   UPDATE attributes SET updated_at = CURRENT_TIMESTAMP
   WHERE id = NEW.id;
END;
COMMIT;
