import { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

// Helper function for consistent error responses
function sendError(res: VercelResponse, statusCode: number, message: string) {
  return res.status(statusCode).json({ error: message });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // This endpoint is expected to be called by a cron job, so no user input validation needed beyond env vars
  if (req.method !== 'GET') {
    return sendError(res, 405, 'Method Not Allowed');
  }

  if (!process.env.VITE_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return sendError(res, 500, 'Supabase environment variables are not set.');
  }

  try {
    const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
    const now = new Date();
    const twentyFourHoursFromNow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const oneHourFromNow = new Date(now.getTime() + 1 * 60 * 60 * 1000);

    // Fetch all active users to process their tasks
    const { data: users, error: usersError } = await supabase
      .from('profiles')
      .select('id');

    if (usersError) {
      console.error('Error fetching users:', usersError);
      return sendError(res, 500, 'Failed to fetch users.');
    }

    for (const user of users) {
      // Fetch tasks due within the next 24 hours and not completed
      const { data: tasks, error: tasksError } = await supabase
        .from('tasks')
        .select('id, title, due_date, status, user_id')
        .eq('user_id', user.id)
        .neq('status', 'Done')
        .lte('due_date', twentyFourHoursFromNow.toISOString()); // Tasks due within 24 hours or already overdue

      if (tasksError) {
        console.error(`Error fetching tasks for user ${user.id}:`, tasksError);
        continue; // Skip to the next user
      }

      for (const task of tasks) {
        const taskDueDate = new Date(task.due_date);

        // Check for overdue tasks
        if (taskDueDate < now) {
          const { data: existingOverdueNudge, error: nudgeError } = await supabase
            .from('notifications')
            .select('id')
            .eq('user_id', user.id)
            .eq('type', 'reschedule_prompt')
            .like('message', `%${task.title}%overdue%`) // Simple check to avoid duplicate nudges for the same task
            .single();

          if (nudgeError && nudgeError.code !== 'PGRST116') { // PGRST116 means no rows found
            console.error('Error checking existing overdue nudge:', nudgeError);
          }

          if (!existingOverdueNudge) {
            await supabase.from('notifications').insert({
              user_id: user.id,
              message: `${task.title} is overdue. Would you like to reschedule?`,
              type: 'reschedule_prompt',
            });
            console.log(`Overdue nudge sent for task: ${task.title} (User: ${user.id})`);
          }
        } 
        // Check for 24-hour nudge
        else if (taskDueDate <= twentyFourHoursFromNow && taskDueDate > oneHourFromNow) {
          const { data: existing24hNudge, error: nudgeError } = await supabase
            .from('notifications')
            .select('id')
            .eq('user_id', user.id)
            .eq('type', 'nudge')
            .like('message', `%${task.title}%due in 24 hours%`)
            .single();

          if (nudgeError && nudgeError.code !== 'PGRST116') {
            console.error('Error checking existing 24h nudge:', nudgeError);
          }

          if (!existing24hNudge) {
            await supabase.from('notifications').insert({
              user_id: user.id,
              message: `${task.title} is due in 24 hours.`,
              type: 'nudge',
            });
            console.log(`24-hour nudge sent for task: ${task.title} (User: ${user.id})`);
          }
        }
        // Check for 1-hour nudge
        else if (taskDueDate <= oneHourFromNow && taskDueDate > now) {
          const { data: existing1hNudge, error: nudgeError } = await supabase
            .from('notifications')
            .select('id')
            .eq('user_id', user.id)
            .eq('type', 'nudge')
            .like('message', `%${task.title}%due in 1 hour%`)
            .single();

          if (nudgeError && nudgeError.code !== 'PGRST116') {
            console.error('Error checking existing 1h nudge:', nudgeError);
          }

          if (!existing1hNudge) {
            await supabase.from('notifications').insert({
              user_id: user.id,
              message: `${task.title} is due in 1 hour.`,
              type: 'nudge',
            });
            console.log(`1-hour nudge sent for task: ${task.title} (User: ${user.id})`);
          }
        }
      }
    }

    return res.status(200).json({ message: 'Deadline nudges processed successfully.' });
  } catch (error) {
    console.error('Unhandled error in deadline-nudges handler:', error);
    return sendError(res, 500, 'An unexpected error occurred.');
  }
}
