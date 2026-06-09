-- Trigger function to notify squad owner and admins on a new or updated pending join request
CREATE OR REPLACE FUNCTION notify_squad_admins_on_join_request()
RETURNS TRIGGER AS $$
DECLARE
  v_goal_title TEXT;
  v_owner_id UUID;
  v_requester_name TEXT;
  v_notif_title_ar TEXT;
  v_notif_title_en TEXT;
  v_notif_content_ar TEXT;
  v_notif_content_en TEXT;
BEGIN
  -- We only notify when status is 'pending'
  IF (TG_OP = 'INSERT' AND NEW.status = 'pending') OR 
     (TG_OP = 'UPDATE' AND NEW.status = 'pending' AND OLD.status IS DISTINCT FROM 'pending') THEN
     
    -- Get the goal title and owner
    SELECT title, user_id INTO v_goal_title, v_owner_id 
    FROM goals 
    WHERE id = NEW.goal_id;
    
    -- Get the requester's name
    SELECT COALESCE(full_name, 'User') INTO v_requester_name 
    FROM profiles 
    WHERE id = NEW.user_id;

    -- Build notification text
    v_notif_title_ar := '👥 طلب انضمام للفريق';
    v_notif_title_en := '👥 Squad Join Request';
    v_notif_content_ar := v_requester_name || ' يريد الانضمام إلى ' || v_goal_title;
    v_notif_content_en := v_requester_name || ' wants to join ' || v_goal_title;

    -- Insert notifications for all unique admins + owner (excluding the requester)
    INSERT INTO inbox_reports (user_id, type, title, content, is_read)
    SELECT 
      u.user_id,
      'squad_join_request',
      CASE 
        WHEN EXISTS (SELECT 1 FROM profiles p WHERE p.id = u.user_id AND p.language IN ('Standard Arabic', 'Egyptian Arabic', 'ar'))
        THEN v_notif_title_ar
        ELSE v_notif_title_en
      END,
      json_build_object(
        'goal_id', NEW.goal_id,
        'goal_title', v_goal_title,
        'requester_id', NEW.user_id,
        'requester_name', v_requester_name,
        'request_id', NEW.id,
        'text', CASE 
                  WHEN EXISTS (SELECT 1 FROM profiles p WHERE p.id = u.user_id AND p.language IN ('Standard Arabic', 'Egyptian Arabic', 'ar'))
                  THEN v_notif_content_ar
                  ELSE v_notif_content_en
                END,
        'message', CASE 
                     WHEN EXISTS (SELECT 1 FROM profiles p WHERE p.id = u.user_id AND p.language IN ('Standard Arabic', 'Egyptian Arabic', 'ar'))
                     THEN v_notif_content_ar
                     ELSE v_notif_content_en
                   END
      ),
      false
    FROM (
      -- Get owner from goals
      SELECT user_id FROM goals WHERE id = NEW.goal_id
      UNION
      -- Get owners and admins from goal_members
      SELECT user_id FROM goal_members WHERE goal_id = NEW.goal_id AND role IN ('owner', 'admin')
    ) u
    WHERE u.user_id IS NOT NULL AND u.user_id != NEW.user_id
    ON CONFLICT DO NOTHING;

  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if it exists
DROP TRIGGER IF EXISTS tr_notify_squad_admins_on_join_request ON squad_join_requests;

-- Create trigger
CREATE TRIGGER tr_notify_squad_admins_on_join_request
AFTER INSERT OR UPDATE ON squad_join_requests
FOR EACH ROW
EXECUTE FUNCTION notify_squad_admins_on_join_request();


-- RPC function to securely handle squad join requests (including re-requesting after rejection)
-- Bypasses client-side RLS UPDATE restrictions securely
DROP FUNCTION IF EXISTS request_squad_join(uuid);

CREATE OR REPLACE FUNCTION request_squad_join(p_goal_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_owner_id UUID;
  v_is_member INT;
  v_existing_status TEXT;
  v_existing_id UUID;
  v_new_id UUID;
BEGIN
  -- 1. Check if the goal exists
  SELECT user_id INTO v_owner_id
  FROM goals
  WHERE id = p_goal_id;

  IF v_owner_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Goal not found');
  END IF;

  -- 2. Check if the user is already the owner or a member
  IF v_owner_id = auth.uid() THEN
    RETURN json_build_object('success', false, 'error', 'ALREADY IN THIS SQUAD');
  END IF;

  SELECT count(*) INTO v_is_member
  FROM goal_members
  WHERE goal_id = p_goal_id AND user_id = auth.uid();

  IF v_is_member > 0 THEN
    RETURN json_build_object('success', false, 'error', 'ALREADY IN THIS SQUAD');
  END IF;

  -- 3. Check for existing request
  SELECT id, status INTO v_existing_id, v_existing_status
  FROM squad_join_requests
  WHERE goal_id = p_goal_id AND user_id = auth.uid();

  IF v_existing_id IS NOT NULL THEN
    IF v_existing_status = 'pending' THEN
      RETURN json_build_object('success', false, 'error', 'REQUEST_PENDING');
    ELSIF v_existing_status = 'approved' THEN
      RETURN json_build_object('success', false, 'error', 'ALREADY IN THIS SQUAD');
    ELSIF v_existing_status = 'rejected' THEN
      -- Update existing rejected request to pending
      UPDATE squad_join_requests
      SET status = 'pending',
          requested_at = now(),
          reviewed_at = NULL
      WHERE id = v_existing_id;

      RETURN json_build_object('success', true, 'request_id', v_existing_id);
    END IF;
  END IF;

  -- 4. Insert a new pending request
  INSERT INTO squad_join_requests (goal_id, user_id, status, role)
  VALUES (p_goal_id, auth.uid(), 'pending', 'member')
  RETURNING id INTO v_new_id;

  RETURN json_build_object('success', true, 'request_id', v_new_id);
END;
$$;
