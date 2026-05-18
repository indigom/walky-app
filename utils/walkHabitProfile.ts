import type { UserProfile } from '../types';

export function hasWalkHabitProfile(user: UserProfile | null | undefined): boolean {
  if (!user) return false;

  const hour = user.usualWalkHour;
  const minute = user.usualWalkMinute;
  const km = user.targetWalkDistanceKm;

  return (
    typeof hour === 'number' &&
    hour >= 0 &&
    hour <= 23 &&
    typeof minute === 'number' &&
    minute >= 0 &&
    minute <= 59 &&
    typeof km === 'number' &&
    Number.isFinite(km) &&
    km > 0
  );
}

export function formatWalkTimeLabel(hour: number, minute: number): string {
  const h = hour % 12 === 0 ? 12 : hour % 12;
  const ampm = hour < 12 ? '오전' : '오후';
  const m = minute.toString().padStart(2, '0');
  return `${ampm} ${h}:${m}`;
}
