-- 1. Add columns to goals table with IF NOT EXISTS
ALTER TABLE goals 
ADD COLUMN IF NOT EXISTS requires_approval BOOLEAN DEFAULT true;

ALTER TABLE goals 
ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT false;

-- 2. Create squad_join_requests table if not exists
CREATE TABLE IF NOT EXISTS squad_join_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  goal_id UUID REFERENCES goals(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  role TEXT DEFAULT 'member',
  requested_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  reviewed_at TIMESTAMP WITH TIME ZONE
);

-- 3. Enable RLS on squad_join_requests
ALTER TABLE squad_join_requests ENABLE ROW LEVEL SECURITY;

-- 4. Drop existing policies on squad_join_requests if they exist
DROP POLICY IF EXISTS "Anyone can insert join requests" ON squad_join_requests;
DROP POLICY IF EXISTS "Only goal admins can update status" ON squad_join_requests;
DROP POLICY IF EXISTS "Users can see their own requests" ON squad_join_requests;

-- 5. Add RLS policies
CREATE POLICY "Anyone can insert join requests" 
ON squad_join_requests 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Only goal admins can update status" 
ON squad_join_requests 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM goals g
    WHERE g.id = squad_join_requests.goal_id
    AND (g.user_id = auth.uid() OR EXISTS (
      SELECT 1 FROM goal_members gm
      WHERE gm.goal_id = g.id
      AND gm.user_id = auth.uid()
      AND gm.role IN ('owner', 'admin')
    ))
  )
);

CREATE POLICY "Users can see their own requests" 
ON squad_join_requests 
FOR SELECT 
USING (
  auth.uid() = user_id OR EXISTS (
    SELECT 1 FROM goals g
    WHERE g.id = squad_join_requests.goal_id
    AND (g.user_id = auth.uid() OR EXISTS (
      SELECT 1 FROM goal_members gm
      WHERE gm.goal_id = g.id
      AND gm.user_id = auth.uid()
      AND gm.role IN ('owner', 'admin')
    ))
  )
);

-- 6. Function to review squad join request
DROP FUNCTION IF EXISTS review_squad_join_request(uuid,text);

CREATE OR REPLACE FUNCTION review_squad_join_request(
  p_request_id UUID,
  p_action TEXT
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  req RECORD;
  new_status TEXT;
BEGIN
  -- Map p_action to new_status ('approve' -> 'approved', 'reject' -> 'rejected')
  IF p_action = 'approve' THEN
    new_status := 'approved';
  ELSE
    new_status := 'rejected';
  END IF;

  SELECT sjr.*, g.title as goal_title 
  INTO req
  FROM squad_join_requests sjr
  JOIN goals g ON g.id = sjr.goal_id
  WHERE sjr.id = p_request_id;
  
  UPDATE squad_join_requests 
  SET status = new_status,
      reviewed_at = now()
  WHERE id = p_request_id;
  
  IF new_status = 'approved' THEN
    INSERT INTO goal_members (goal_id, user_id, role)
    VALUES (req.goal_id, req.user_id, COALESCE(req.role, 'member'))
    ON CONFLICT DO NOTHING;
    
    INSERT INTO inbox_reports 
    (user_id, type, title, message, goal_id)
    VALUES (
      req.user_id,
      'join_approved',
      'Request Approved',
      'Your request to join ' || req.goal_title || ' was approved',
      req.goal_id
    );
  ELSE
    INSERT INTO inbox_reports 
    (user_id, type, title, message, goal_id)
    VALUES (
      req.user_id,
      'join_rejected',
      'Request Declined', 
      'Your request to join ' || req.goal_title || ' was declined',
      req.goal_id
    );
  END IF;
END;
$$;
