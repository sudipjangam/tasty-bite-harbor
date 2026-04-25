ALTER TABLE inventory_lots 
DROP CONSTRAINT IF EXISTS inventory_lots_inventory_item_id_fkey;

ALTER TABLE inventory_lots 
ADD CONSTRAINT inventory_lots_inventory_item_id_fkey 
FOREIGN KEY (inventory_item_id) 
REFERENCES inventory_items(id) 
ON DELETE CASCADE;
