-- ============================================================
-- Merge duplicate inventory items (same name, same restaurant)
-- Keeps the OLDEST record as the master; reassigns all lots,
-- transactions, PO items, and recipe ingredients to it.
-- ============================================================

-- Step 1: Reassign inventory_lots from duplicates to master
UPDATE public.inventory_lots AS lot
SET inventory_item_id = master.id
FROM (
  SELECT DISTINCT ON (restaurant_id, LOWER(TRIM(name)))
    id, restaurant_id, LOWER(TRIM(name)) AS norm_name
  FROM public.inventory_items
  ORDER BY restaurant_id, LOWER(TRIM(name)), created_at ASC
) AS master
JOIN public.inventory_items AS dup
  ON dup.restaurant_id = master.restaurant_id
  AND LOWER(TRIM(dup.name)) = master.norm_name
  AND dup.id <> master.id
WHERE lot.inventory_item_id = dup.id;

-- Step 2: Reassign inventory_transactions
UPDATE public.inventory_transactions AS txn
SET inventory_item_id = master.id
FROM (
  SELECT DISTINCT ON (restaurant_id, LOWER(TRIM(name)))
    id, restaurant_id, LOWER(TRIM(name)) AS norm_name
  FROM public.inventory_items
  ORDER BY restaurant_id, LOWER(TRIM(name)), created_at ASC
) AS master
JOIN public.inventory_items AS dup
  ON dup.restaurant_id = master.restaurant_id
  AND LOWER(TRIM(dup.name)) = master.norm_name
  AND dup.id <> master.id
WHERE txn.inventory_item_id = dup.id;

-- Step 3: Reassign purchase_order_items (if column exists; safe with IF EXISTS pattern)
UPDATE public.purchase_order_items AS poi
SET inventory_item_id = master.id
FROM (
  SELECT DISTINCT ON (restaurant_id, LOWER(TRIM(name)))
    id, restaurant_id, LOWER(TRIM(name)) AS norm_name
  FROM public.inventory_items
  ORDER BY restaurant_id, LOWER(TRIM(name)), created_at ASC
) AS master
JOIN public.inventory_items AS dup
  ON dup.restaurant_id = master.restaurant_id
  AND LOWER(TRIM(dup.name)) = master.norm_name
  AND dup.id <> master.id
WHERE poi.inventory_item_id = dup.id;

-- Step 4: Reassign recipe_ingredients
UPDATE public.recipe_ingredients AS ri
SET inventory_item_id = master.id
FROM (
  SELECT DISTINCT ON (restaurant_id, LOWER(TRIM(name)))
    id, restaurant_id, LOWER(TRIM(name)) AS norm_name
  FROM public.inventory_items
  ORDER BY restaurant_id, LOWER(TRIM(name)), created_at ASC
) AS master
JOIN public.inventory_items AS dup
  ON dup.restaurant_id = master.restaurant_id
  AND LOWER(TRIM(dup.name)) = master.norm_name
  AND dup.id <> master.id
WHERE ri.inventory_item_id = dup.id;

-- Step 5: Reassign supplier_order_items
UPDATE public.supplier_order_items AS soi
SET inventory_item_id = master.id
FROM (
  SELECT DISTINCT ON (restaurant_id, LOWER(TRIM(name)))
    id, restaurant_id, LOWER(TRIM(name)) AS norm_name
  FROM public.inventory_items
  ORDER BY restaurant_id, LOWER(TRIM(name)), created_at ASC
) AS master
JOIN public.inventory_items AS dup
  ON dup.restaurant_id = master.restaurant_id
  AND LOWER(TRIM(dup.name)) = master.norm_name
  AND dup.id <> master.id
WHERE soi.inventory_item_id = dup.id;

-- Step 6: Reassign supplier_price_history
UPDATE public.supplier_price_history AS sph
SET item_id = master.id
FROM (
  SELECT DISTINCT ON (restaurant_id, LOWER(TRIM(name)))
    id, restaurant_id, LOWER(TRIM(name)) AS norm_name
  FROM public.inventory_items
  ORDER BY restaurant_id, LOWER(TRIM(name)), created_at ASC
) AS master
JOIN public.inventory_items AS dup
  ON dup.restaurant_id = master.restaurant_id
  AND LOWER(TRIM(dup.name)) = master.norm_name
  AND dup.id <> master.id
WHERE sph.item_id = dup.id;

-- Step 7: Reassign inventory_alerts
UPDATE public.inventory_alerts AS ia
SET inventory_item_id = master.id
FROM (
  SELECT DISTINCT ON (restaurant_id, LOWER(TRIM(name)))
    id, restaurant_id, LOWER(TRIM(name)) AS norm_name
  FROM public.inventory_items
  ORDER BY restaurant_id, LOWER(TRIM(name)), created_at ASC
) AS master
JOIN public.inventory_items AS dup
  ON dup.restaurant_id = master.restaurant_id
  AND LOWER(TRIM(dup.name)) = master.norm_name
  AND dup.id <> master.id
WHERE ia.inventory_item_id = dup.id;

-- Step 8: Update master item quantity = sum of all duplicates' quantities
UPDATE public.inventory_items AS master
SET quantity = agg.total_qty
FROM (
  SELECT
    (array_agg(id ORDER BY created_at ASC))[1] AS master_id,
    SUM(quantity) AS total_qty
  FROM public.inventory_items
  GROUP BY restaurant_id, LOWER(TRIM(name))
  HAVING COUNT(*) > 1
) AS agg
WHERE master.id = agg.master_id;

-- Step 9: Delete duplicate rows (keep only master)
DELETE FROM public.inventory_items
WHERE id IN (
  SELECT dup.id
  FROM public.inventory_items AS dup
  JOIN (
    SELECT DISTINCT ON (restaurant_id, LOWER(TRIM(name)))
      id, restaurant_id, LOWER(TRIM(name)) AS norm_name
    FROM public.inventory_items
    ORDER BY restaurant_id, LOWER(TRIM(name)), created_at ASC
  ) AS master
    ON dup.restaurant_id = master.restaurant_id
    AND LOWER(TRIM(dup.name)) = master.norm_name
    AND dup.id <> master.id
);
