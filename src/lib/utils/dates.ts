export function toLocalDate(utcDate: string): string {
  return new Date(utcDate).toLocaleDateString();
}

export function toLocalDateTime(utcDate: string): string {
  return new Date(utcDate).toLocaleString();
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
