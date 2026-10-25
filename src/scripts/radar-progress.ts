/**
 * 学习进度只存在浏览器本地：不登录、不上传，换设备不会同步。
 * 结构里保留每一天的动作，用来算连续天数与最近 7 天。
 */

export interface PlanItem {
  id: string;
  title: string;
  chapter: number;
  chapterTitle: string;
  section: string;
  minutes: number;
  href: string;
}

export interface RadarPlan {
  date: string;
  ids: string[];
  mode: 'learn' | 'review';
}

export interface RadarState {
  v: 1;
  done: Record<string, number>;
  days: Record<string, number>;
  seen: Record<string, number>;
  plan: RadarPlan | null;
}

export const STORAGE_KEY = 'radar.progress.v1';
export const PROGRESS_EVENT = 'radar-progress-change';

const DAYS_KEPT = 180;

let fallback: RadarState | null = null;

function emptyState(): RadarState {
  return { v: 1, done: {}, days: {}, seen: {}, plan: null };
}

function storage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function sanitize(raw: unknown): RadarState {
  const state = emptyState();
  if (!raw || typeof raw !== 'object') return state;
  const input = raw as Partial<RadarState>;
  if (input.done && typeof input.done === 'object') state.done = input.done;
  if (input.days && typeof input.days === 'object') state.days = input.days;
  if (input.seen && typeof input.seen === 'object') state.seen = input.seen;
  if (input.plan && typeof input.plan === 'object' && Array.isArray(input.plan.ids)) {
    state.plan = input.plan as RadarPlan;
  }
  return state;
}

export function dateKey(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function shiftKey(offset: number): string {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() - offset);
  return dateKey(date);
}

export function loadState(): RadarState {
  const raw = storage()?.getItem(STORAGE_KEY);
  if (!raw) return fallback ?? emptyState();
  try {
    return sanitize(JSON.parse(raw));
  } catch {
    return emptyState();
  }
}

export function saveState(state: RadarState, notify = true): void {
  fallback = state;
  try {
    storage()?.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* 隐私模式下写不进去，本次会话继续用内存态 */
  }
  if (notify && typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(PROGRESS_EVENT, { detail: state }));
  }
}

export function isDone(state: RadarState, id: string): boolean {
  return Boolean(state.done[id]);
}

export function doneCount(state: RadarState): number {
  return Object.keys(state.done).length;
}

export function markSeen(state: RadarState): void {
  const key = dateKey();
  const stamp = Date.now();
  if (!state.seen[key] || stamp - state.seen[key] > 6 * 60 * 60 * 1000) {
    state.seen[key] = stamp;
  }
  prune(state);
  saveState(state, false);
}

/** 标记 / 取消完成，返回操作后的状态 */
export function toggleDone(state: RadarState, id: string): boolean {
  if (state.done[id]) {
    const stamp = state.done[id];
    delete state.done[id];
    const day = dateKey(new Date(stamp));
    if (state.days[day]) state.days[day] = Math.max(0, state.days[day] - 1);
    saveState(state);
    return false;
  }
  state.done[id] = Date.now();
  const day = dateKey();
  state.days[day] = (state.days[day] ?? 0) + 1;
  saveState(state);
  return true;
}

function prune(state: RadarState): void {
  const cutoff = shiftKey(DAYS_KEPT);
  for (const key of Object.keys(state.days)) {
    if (key < cutoff) delete state.days[key];
  }
  for (const key of Object.keys(state.seen)) {
    if (key < cutoff) delete state.seen[key];
  }
}

export function hasActivity(state: RadarState, key: string): boolean {
  return (state.days[key] ?? 0) > 0 || Boolean(state.seen[key]);
}

export function streakOf(state: RadarState): number {
  let offset = hasActivity(state, shiftKey(0)) ? 0 : 1;
  let count = 0;
  while (count < 400 && hasActivity(state, shiftKey(offset))) {
    count += 1;
    offset += 1;
  }
  return count;
}

export interface WeekDay {
  key: string;
  label: string;
  weekday: string;
  count: number;
  active: boolean;
  today: boolean;
}

export function weekOf(state: RadarState): WeekDay[] {
  const weekdays = ['日', '一', '二', '三', '四', '五', '六'];
  const today = dateKey();
  return Array.from({ length: 7 }, (_, index) => {
    const offset = 6 - index;
    const date = new Date();
    date.setHours(12, 0, 0, 0);
    date.setDate(date.getDate() - offset);
    const key = dateKey(date);
    return {
      key,
      label: `${date.getMonth() + 1}.${date.getDate()}`,
      weekday: weekdays[date.getDay()],
      count: state.days[key] ?? 0,
      active: hasActivity(state, key),
      today: key === today,
    };
  });
}

function pickBatch(
  pool: PlanItem[],
  cap = 4,
  minuteCap = 14,
  skip = new Set<string>()
): PlanItem[] {
  const preferred = pool.filter((item) => !skip.has(item.id));
  const source = preferred.length > 0 ? preferred : pool;
  const picked: PlanItem[] = [];
  let minutes = 0;
  for (const item of source) {
    if (picked.length >= cap) break;
    if (picked.length > 0 && minutes + item.minutes > minuteCap) break;
    picked.push(item);
    minutes += item.minutes;
  }
  return picked;
}

function reviewBatch(curriculum: PlanItem[], date: string): PlanItem[] {
  if (curriculum.length === 0) return [];
  const seed = [...date].reduce((sum, char) => sum + char.charCodeAt(0), 0);
  const picked: PlanItem[] = [];
  const seen = new Set<string>();
  for (let step = 0; step < 4; step += 1) {
    const item = curriculum[(seed * 7 + step * 37) % curriculum.length];
    if (!seen.has(item.id)) {
      seen.add(item.id);
      picked.push(item);
    }
  }
  return picked;
}

export function buildPlan(
  state: RadarState,
  curriculum: PlanItem[],
  skip: Set<string> = new Set()
): RadarPlan {
  const date = dateKey();
  const unread = curriculum.filter((item) => !state.done[item.id]);
  if (unread.length === 0) {
    return { date, ids: reviewBatch(curriculum, date).map((item) => item.id), mode: 'review' };
  }
  return { date, ids: pickBatch(unread, 4, 14, skip).map((item) => item.id), mode: 'learn' };
}

/** 当天的计划固定下来，完成一项不会把列表挤走 */
export function ensurePlan(state: RadarState, curriculum: PlanItem[]): RadarPlan {
  const date = dateKey();
  if (state.plan?.date === date && state.plan.ids.length > 0) return state.plan;
  state.plan = buildPlan(state, curriculum);
  saveState(state, false);
  return state.plan;
}

export function refreshPlan(state: RadarState, curriculum: PlanItem[]): RadarPlan {
  state.plan = buildPlan(state, curriculum, new Set(state.plan?.ids ?? []));
  saveState(state);
  return state.plan;
}

export function planItems(plan: RadarPlan, curriculum: PlanItem[]): PlanItem[] {
  const byId = new Map(curriculum.map((item) => [item.id, item]));
  return plan.ids.map((id) => byId.get(id)).filter((item): item is PlanItem => Boolean(item));
}

export function firstUnread(state: RadarState, curriculum: PlanItem[]): PlanItem | null {
  return curriculum.find((item) => !state.done[item.id]) ?? null;
}
