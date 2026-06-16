DO $$
DECLARE
    r RECORD;
    c RECORD;
    prog RECORD;
    t RECORD;
    spend_thresh NUMERIC;
    pts_per_amt NUMERIC;
    tier_mult NUMERIC;
    earned_pts INTEGER;
    redeemed_pts INTEGER;
    correct_pts INTEGER;
BEGIN
    -- Loop through all restaurants
    FOR r IN SELECT id FROM public.restaurants LOOP
        -- Get program settings for restaurant
        SELECT spend_threshold, points_per_amount INTO prog
        FROM public.loyalty_programs 
        WHERE restaurant_id = r.id;
        
        IF NOT FOUND THEN
            CONTINUE;
        END IF;
        
        spend_thresh := COALESCE(prog.spend_threshold, 10);
        IF spend_thresh = 0 THEN 
            spend_thresh := 10;
        END IF;
        
        pts_per_amt := COALESCE(prog.points_per_amount, 1);
        
        -- Loop through all customers for this restaurant
        FOR c IN SELECT id, total_spent, loyalty_points, loyalty_tier_id FROM public.customers WHERE restaurant_id = r.id LOOP
            -- Get tier multiplier
            tier_mult := 1;
            IF c.loyalty_tier_id IS NOT NULL THEN
                SELECT points_multiplier INTO t FROM public.loyalty_tiers WHERE id = c.loyalty_tier_id;
                IF FOUND THEN
                    tier_mult := COALESCE(t.points_multiplier, 1);
                END IF;
            END IF;
            
            -- Get total redeemed points
            SELECT COALESCE(SUM(points), 0) INTO redeemed_pts
            FROM public.loyalty_transactions 
            WHERE customer_id = c.id AND transaction_type = 'redeem';
            
            -- Calculate expected points based on total spent
            earned_pts := FLOOR((COALESCE(c.total_spent, 0) / spend_thresh) * pts_per_amt * tier_mult);
            correct_pts := GREATEST(0, earned_pts - redeemed_pts);
            
            -- Update customer if points mismatch
            IF correct_pts <> COALESCE(c.loyalty_points, 0) THEN
                UPDATE public.customers 
                SET loyalty_points = correct_pts 
                WHERE id = c.id;
            END IF;
        END LOOP;
    END LOOP;
END $$;
