import type { Lesson, Level, LevelId, Unit } from '../../lib/path/types';
import { basics } from './basics';
import { beginner } from './beginner';
import { intermediate } from './intermediate';
import { expert } from './expert';

export const LEVELS: Level[] = [basics, beginner, intermediate, expert];

export function getLevel(id: LevelId): Level {
  return LEVELS.find((l) => l.id === id) ?? LEVELS[0];
}

export function allLessons(): Lesson[] {
  return LEVELS.flatMap((l) => l.units.flatMap((u) => u.lessons));
}

export function findLesson(id: string): { level: Level; unit: Unit; lesson: Lesson } | undefined {
  for (const level of LEVELS)
    for (const unit of level.units) {
      const lesson = unit.lessons.find((l) => l.id === id);
      if (lesson) return { level, unit, lesson };
    }
  return undefined;
}
