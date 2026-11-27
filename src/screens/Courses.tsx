import { ArrowRight, Check, Puzzle } from 'lucide-react';
import { COURSES, getCourse, type Course } from '../data/courses';
import { getLesson } from '../data/lessons';
import { THEME_INFO } from '../lib/puzzles';
import { useApp } from '../lib/store/app';
import { navigate } from '../lib/router';
import { Empty, Header, Section } from '../components/ui';

function lessonProgress(c: Course, lessons: Record<string, { completed: boolean }>) {
  const ids = c.sections.flatMap((s) => s.items.filter((i) => i.kind === 'lesson').map((i) => (i as { id: string }).id));
  return { done: ids.filter((id) => lessons[id]?.completed).length, total: ids.length };
}

export function CoursesHub() {
  const lessons = useApp((s) => s.lessons);
  return (
    <div className="page">
      <Header title="Courses" backTo="/train" sub="Structured paths through one skill each: lessons with engine-checked tasks, trainers, and themed puzzles from real games." />
      <div className="course-grid">
        {COURSES.map((c) => {
          const p = lessonProgress(c, lessons);
          return (
            <button key={c.id} className="course-card" onClick={() => navigate(c.to ?? `/courses/${c.id}`)}>
              <span className="course-card-title">{c.title}</span>
              <span className="muted small">{c.blurb}</span>
              {p.total > 0 && (
                <span className="course-card-progress">
                  <span className="meter"><span className="meter-fill" style={{ width: `${(p.done / p.total) * 100}%` }} /></span>
                  <span className="faint small num">{p.done}/{p.total} lessons</span>
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function CourseScreen({ id }: { id: string }) {
  const c = getCourse(id);
  const lessons = useApp((s) => s.lessons);
  if (!c) {
    return (
      <div className="page">
        <Header title="Course" backTo="/courses" />
        <Empty title="Course not found" />
      </div>
    );
  }
  return (
    <div className="page page-narrow">
      <Header title={c.title} backTo="/courses" sub={c.blurb} />
      {c.sections.map((s) => (
        <Section key={s.title} title={s.title}>
          {s.text && <p className="muted mb8">{s.text}</p>}
          <div className={s.items.every((i) => i.kind === 'puzzles') ? 'chip-row' : 'list'}>
            {s.items.map((item, i) => {
              if (item.kind === 'lesson') {
                const l = getLesson(item.id);
                if (!l) return null;
                const done = lessons[l.id]?.completed;
                return (
                  <button key={i} className="list-item" onClick={() => navigate(`/train/lesson/${l.id}`)}>
                    <span className={`lesson-check${done ? ' is-done' : ''}`}>{done ? <Check size={16} /> : null}</span>
                    <span className="list-item-main">
                      <span className="list-item-title">{l.title}</span>
                      <span className="list-item-sub">{l.summary}</span>
                    </span>
                    <span className="list-item-meta">{l.minutes} min</span>
                  </button>
                );
              }
              if (item.kind === 'trainer') {
                return (
                  <button key={i} className="list-item" onClick={() => navigate(item.to)}>
                    <span className="list-item-main">
                      <span className="list-item-title">{item.title}</span>
                      <span className="list-item-sub">{item.detail}</span>
                    </span>
                    <ArrowRight size={18} className="muted" />
                  </button>
                );
              }
              return (
                <button key={i} className="chip" onClick={() => navigate(`/puzzles/play?mode=theme&theme=${item.theme}&count=10`)}>
                  <Puzzle size={14} className="inline-icon" /> {item.label ?? THEME_INFO[item.theme]?.label ?? item.theme}
                </button>
              );
            })}
          </div>
        </Section>
      ))}
    </div>
  );
}
