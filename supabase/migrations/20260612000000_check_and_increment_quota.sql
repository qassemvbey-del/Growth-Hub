-- 1. Safe Creation of Enum Type
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_tier_type') THEN 
        CREATE TYPE user_tier_type AS ENUM ('free', 'pro', 'elite'); 
    END IF; 
END $$;

-- 2. Safe Addition of Columns to public.profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS user_tier user_tier_type DEFAULT 'free'::user_tier_type;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS ai_request_count INT DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_ai_reset TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS max_squads_allowed INT DEFAULT 1;

-- 3. Squad Limits Management Trigger Function
CREATE OR REPLACE FUNCTION public.update_max_squads_allowed()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.user_tier = 'free' THEN
        NEW.max_squads_allowed := 1;
    ELSIF NEW.user_tier = 'pro' THEN
        NEW.max_squads_allowed := 3;
    ELSIF NEW.user_tier = 'elite' THEN
        NEW.max_squads_allowed := 9999;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Re-create Trigger Bound to public.profiles
DROP TRIGGER IF EXISTS trigger_update_max_squads_allowed ON public.profiles;
CREATE TRIGGER trigger_update_max_squads_allowed
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_max_squads_allowed();

-- 5. Atomic Quota Verification and Increment Function (RPC)
CREATE OR REPLACE FUNCTION public.check_and_increment_quota(
    p_user_id UUID,
    OUT allowed BOOLEAN,
    OUT lang TEXT
) AS $$
DECLARE
    v_tier user_tier_type;
    v_count INT;
    v_reset TIMESTAMP WITH TIME ZONE;
    v_limit INT;
    v_lang TEXT;
BEGIN
    -- Select current user profile statistics with row locking to eliminate race conditions
    SELECT user_tier, ai_request_count, last_ai_reset, language 
    INTO v_tier, v_count, v_reset, v_lang 
    FROM public.profiles 
    WHERE id = p_user_id 
    FOR UPDATE;

    -- Fallback default check if language configuration is absent
    IF v_lang IS NULL THEN
        v_lang := 'en';
    END IF;

    -- Check if the 12-hour sliding window cooldown threshold has elapsed
    IF NOW() - v_reset >= INTERVAL '12 hours' THEN
        v_count := 0;
        v_reset := NOW();
        
        UPDATE public.profiles 
        SET ai_request_count = 0, last_ai_reset = NOW() 
        WHERE id = p_user_id;
    END IF;

    -- Map system consumption limits to corresponding tiers
    IF v_tier = 'free' THEN
        v_limit := 3;
    ELSIF v_tier = 'pro' THEN
        v_limit := 50;
    ELSIF v_tier = 'elite' THEN
        v_limit := 150;
    ELSE
        v_limit := 3;
    END IF;

    -- Evaluate allowance and update counter atomically within a single roundtrip
    IF v_count >= v_limit THEN
        allowed := FALSE;
        lang := v_lang;
        RETURN;
    ELSE
        UPDATE public.profiles 
        SET ai_request_count = v_count + 1 
        WHERE id = p_user_id;
        
        allowed := TRUE;
        lang := v_lang;
        RETURN;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
