-- Add component_table_mapping for customers to POS components
INSERT INTO public.component_table_mapping (component_id, table_name)
SELECT id, 'customers'
FROM public.app_components
WHERE name IN ('POS', 'QSR POS', 'Orders')
ON CONFLICT ON CONSTRAINT component_table_mapping_component_id_table_name_key DO NOTHING;

-- Add component_table_mapping for loyalty_tiers to POS components
INSERT INTO public.component_table_mapping (component_id, table_name)
SELECT id, 'loyalty_tiers'
FROM public.app_components
WHERE name IN ('POS', 'QSR POS', 'Orders')
ON CONFLICT ON CONSTRAINT component_table_mapping_component_id_table_name_key DO NOTHING;
