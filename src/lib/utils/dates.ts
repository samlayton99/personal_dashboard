export function toLocalDate(utcDate: string): string {
  return new Date(utcDate).toLocaleDateString();
}

export function toLocalDateTime(utcDate: string): string {
  return new Date(utcDate).toLocaleString();
}

export function isMoreThanNDaysOut(date: string, n: number): boolean {
  const target = new Date(date);
  const now = new Date();
  const diffMs = target.getTime() - now.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  return diffDays > n;
}

export function startOfWeek(): Date {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1);
  const start = new Date(now);
  start.setDate(diff);
  start.setHours(0, 0, 0, 0);
  return start;
}

export function startOfMonth(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

export function todayDateString(): string {
  return new Date().toISOString().split("T")[0];
}
