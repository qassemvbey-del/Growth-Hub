-- 1. Add general_access column to goals table if not exists
ALTER TABLE goals 
ADD COLUMN IF NOT EXISTS general_access TEXT DEFAULT 'restricted';

-- 2. Ensure RLS on goals allows reading public / anyone_with_link goals
DROP POLICY IF EXISTS "Public goals are viewable by anyone logged in" ON goals;

CREATE POLICY "Public goals are viewable by anyone logged in"
ON goals
FOR SELECT
USING (
  general_access = 'anyone_with_link'
  OR is_public = true
  OR user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM goal_members gm
    WHERE gm.goal_id = goals.id
    AND gm.user_id = auth.uid()
  )
);

-- 3. Create function to join squad via link securely (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION join_squad_by_link(p_goal_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_goal RECORD;
  v_already_member BOOLEAN;
  v_role TEXT := 'member';
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'UNAUTHENTICATED');
  END IF;

  -- Select target goal bypassing user RLS
  SELECT id, user_id, is_public, requires_approval, general_access, metadata
  INTO v_goal
  FROM goals
  WHERE id = p_goal_id AND is_archived = false;

  IF v_goal.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'GOAL_NOT_FOUND');
  END IF;

  -- Check if goal permits auto-join
  IF NOT (
    v_goal.general_access = 'anyone_with_link'
    OR (v_goal.is_public = true AND v_goal.requires_approval = false)
    OR (v_goal.metadata->>'general_access' = 'anyone_with_link')
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'ACCESS_RESTRICTED', 'requires_approval', v_goal.requires_approval);
  END IF;

  -- Check if already a member or owner
  IF v_goal.user_id = v_user_id THEN
    RETURN jsonb_build_object('success', true, 'status', 'OWNER', 'role', 'owner');
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM goal_members
    WHERE goal_id = p_goal_id AND user_id = v_user_id
  ) INTO v_already_member;

  IF v_already_member THEN
    RETURN jsonb_build_object('success', true, 'status', 'ALREADY_MEMBER');
  END IF;

  -- Insert into goal_members
  INSERT INTO goal_members (goal_id, user_id, role, joined_at)
  VALUES (p_goal_id, v_user_id, v_role, NOW());

  RETURN jsonb_build_object(
    'success', true,
    'status', 'JOINED',
    'goal_id', p_goal_id,
    'role', v_role
  );
END;
$$;
