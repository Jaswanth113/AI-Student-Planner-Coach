import { useMemo } from 'react';
import { useReminders } from '@/hooks/useSupabaseData';

export function RemindersWidget() {
  const { reminders, loading } = useReminders();

  const upcoming = useMemo(() => {
    const nowIso = new Date().toISOString();
    return (reminders || [])
      .filter(r => !!r.due_date && (r.due_date as string) >= nowIso)
      .sort((a, b) => new Date(a.due_date as string).getTime() - new Date(b.due_date as string).getTime())
      .slice(0, 5);
  }, [reminders]);

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <h4 className="mb-2 text-base font-semibold text-gray-900">Upcoming Reminders</h4>
      {loading ? (
        <div className="text-sm text-gray-500">Loading…</div>
      ) : upcoming.length === 0 ? (
        <div className="text-sm text-gray-500">No upcoming reminders.</div>
      ) : (
        <ul className="space-y-2">
          {upcoming.map((r) => (
            <li key={r.id} className="flex items-center justify-between">
              <span className="text-sm text-gray-800">{r.title}</span>
              <span className="text-xs text-gray-500">{new Date(r.due_date as string).toLocaleString()}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
