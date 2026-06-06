-- Enable Row Level Security for public.tasks
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can view tasks of their own cups" ON public.tasks;
DROP POLICY IF EXISTS "Users can insert tasks into their own cups" ON public.tasks;
DROP POLICY IF EXISTS "Users can update tasks of their own cups" ON public.tasks;
DROP POLICY IF EXISTS "Users can select tasks in goals they own or are members of" ON public.tasks;
DROP POLICY IF EXISTS "Users can insert tasks in goals they own or are members of" ON public.tasks;
DROP POLICY IF EXISTS "Users can update tasks in goals they own or are members of" ON public.tasks;
DROP POLICY IF EXISTS "Users can delete tasks in goals they own or are members of" ON public.tasks;

-- Create SELECT policy (all members, viewers, guests can view tasks of goals they belong to)
CREATE POLICY "Users can select tasks in goals they own or are members of" ON public.tasks
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.goals g
    WHERE g.id = tasks.goal_id
    AND (g.user_id = auth.uid() OR EXISTS (
      SELECT 1 FROM public.goal_members gm
      WHERE gm.goal_id = g.id
      AND gm.user_id = auth.uid()
    ))
  )
);

-- Create INSERT policy (owners, admins, members can insert tasks)
CREATE POLICY "Users can insert tasks in goals they own or are members of" ON public.tasks
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.goals g
    WHERE g.id = tasks.goal_id
    AND (g.user_id = auth.uid() OR EXISTS (
      SELECT 1 FROM public.goal_members gm
      WHERE gm.goal_id = g.id
      AND gm.user_id = auth.uid()
      AND gm.role IN ('owner', 'admin', 'member')
    ))
  )
);

-- Create UPDATE policy (owners, admins, members can update tasks)
CREATE POLICY "Users can update tasks in goals they own or are members of" ON public.tasks
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM public.goals g
    WHERE g.id = tasks.goal_id
    AND (g.user_id = auth.uid() OR EXISTS (
      SELECT 1 FROM public.goal_members gm
      WHERE gm.goal_id = g.id
      AND gm.user_id = auth.uid()
      AND gm.role IN ('owner', 'admin', 'member')
    ))
  )
);

-- Create DELETE policy (owners, admins, members can delete tasks)
CREATE POLICY "Users can delete tasks in goals they own or are members of" ON public.tasks
FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM public.goals g
    WHERE g.id = tasks.goal_id
    AND (g.user_id = auth.uid() OR EXISTS (
      SELECT 1 FROM public.goal_members gm
      WHERE gm.goal_id = g.id
      AND gm.user_id = auth.uid()
      AND gm.role IN ('owner', 'admin', 'member')
    ))
  )
);
