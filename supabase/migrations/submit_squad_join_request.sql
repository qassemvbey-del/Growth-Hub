-- Drop existing function if it exists to replace it
DROP FUNCTION IF EXISTS submit_squad_join_request(text);

CREATE OR REPLACE FUNCTION submit_squad_join_request(input_code TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_goal_id UUID;
  v_owner_id UUID;
  v_requires_approval BOOLEAN;
  v_is_member INT;
  v_existing_status TEXT;
  v_existing_id UUID;
BEGIN
  -- 1. Find the goal with this invite code
  SELECT id, user_id, COALESCE(requires_approval, true) INTO v_goal_id, v_owner_id, v_requires_approval
  FROM goals
  WHERE metadata->>'invite_code' = input_code;

  IF v_goal_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'INVALID_CODE');
  END IF;

  -- 2. Check if the user is already the owner or a member
  IF v_owner_id = auth.uid() THEN
    RETURN json_build_object('success', false, 'error', 'ALREADY IN THIS SQUAD');
  END IF;

  SELECT count(*) INTO v_is_member
  FROM goal_members
  WHERE goal_id = v_goal_id AND user_id = auth.uid();

  IF v_is_member > 0 THEN
    RETURN json_build_object('success', false, 'error', 'ALREADY IN THIS SQUAD');
  END IF;

  -- 3. Check for existing request in squad_join_requests
  SELECT id, status INTO v_existing_id, v_existing_status
  FROM squad_join_requests
  WHERE goal_id = v_goal_id AND user_id = auth.uid();

  IF v_existing_id IS NOT NULL THEN
    IF v_existing_status = 'pending' THEN
      RETURN json_build_object('success', false, 'error', 'REQUEST_PENDING');
    ELSIF v_existing_status = 'approved' THEN
      RETURN json_build_object('success', false, 'error', 'ALREADY IN THIS SQUAD');
    ELSIF v_existing_status = 'rejected' THEN
      -- If rejected, let them submit again by updating the existing request to pending!
      UPDATE squad_join_requests
      SET status = 'pending',
          requested_at = now(),
          reviewed_at = NULL
      WHERE id = v_existing_id;

      RETURN json_build_object('success', true);
    END IF;
  END IF;

  -- 4. Insert a new pending request
  INSERT INTO squad_join_requests (goal_id, user_id, status, role)
  VALUES (v_goal_id, auth.uid(), 'pending', 'member');

  RETURN json_build_object('success', true);
END;
$$;
