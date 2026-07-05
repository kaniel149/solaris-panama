import { supabase } from './supabase';

// ─── Types ───────────────────────────────────────────────────────

export type TaskStatus = 'todo' | 'in_progress' | 'done';
export type TaskPriority = 'low' | 'medium' | 'high';

export interface Task {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  due_date: string | null;
  lead_id: string | null;
  assigned_to: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateTaskParams {
  title: string;
  description?: string | null;
  priority?: TaskPriority;
  due_date?: string | null;
  lead_id?: string | null;
  assigned_to?: string | null;
}

export interface UpdateTaskParams {
  title?: string;
  description?: string | null;
  status?: TaskStatus;
  priority?: TaskPriority;
  due_date?: string | null;
  lead_id?: string | null;
  assigned_to?: string | null;
}

export interface TaskFilters {
  status?: TaskStatus;
  priority?: TaskPriority;
  has_due_date?: boolean;
}

// ─── CRUD ────────────────────────────────────────────────────────

export async function getTasks(filters?: TaskFilters): Promise<Task[]> {
  let query = supabase
    .from('tasks')
    .select('*')
    .order('created_at', { ascending: false });

  if (filters?.status) query = query.eq('status', filters.status);
  if (filters?.priority) query = query.eq('priority', filters.priority);
  if (filters?.has_due_date) query = query.not('due_date', 'is', null);

  const { data, error } = await query;
  if (error) throw error;
  return (data as Task[]) ?? [];
}

export async function createTask(params: CreateTaskParams): Promise<Task> {
  const { data, error } = await supabase
    .from('tasks')
    .insert({
      title: params.title,
      description: params.description ?? null,
      status: 'todo',
      priority: params.priority ?? 'medium',
      due_date: params.due_date ?? null,
      lead_id: params.lead_id ?? null,
      assigned_to: params.assigned_to ?? null,
    })
    .select()
    .single();
  if (error) throw error;
  return data as Task;
}

export async function updateTask(id: string, updates: UpdateTaskParams): Promise<Task> {
  const { data, error } = await supabase
    .from('tasks')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data as Task;
}

export async function deleteTask(id: string): Promise<void> {
  const { error } = await supabase.from('tasks').delete().eq('id', id);
  if (error) throw error;
}

export function isOverdueTask(task: Task): boolean {
  if (!task.due_date || task.status === 'done') return false;
  return new Date(task.due_date) < new Date();
}
