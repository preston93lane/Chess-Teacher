import { CheckCircle2, ListChecks } from 'lucide-react';
import { useApp } from '../lib/store/app';
import { findBlock } from '../lib/program';
import { navigate, query, useRoute } from '../lib/router';

export function useBlockId(): string | null {
  const path = useRoute();
  return query(path).get('block');
}

/** Shown on screens launched from a training-program day. */
export function BlockBanner({ id }: { id?: string | null }) {
  const routeId = useBlockId();
  const blockId = id ?? routeId;
  const program = useApp((s) => s.program);
  const found = findBlock(program, blockId);
  if (!found || !program) return null;
  const done = program.done.includes(found.block.id);
  return (
    <div className={`block-banner${done ? ' is-done' : ''}`}>
      {done ? <CheckCircle2 size={18} /> : <ListChecks size={18} />}
      <span className="block-banner-text">
        <span className="block-banner-day">Week {found.day.week} · Day {found.day.day}</span>
        <span className="block-banner-title">{found.block.title}</span>
      </span>
      <button className="link-btn" onClick={() => navigate('/program')}>
        {done ? 'Done — back to plan' : 'Today’s plan'}
      </button>
    </div>
  );
}

export function completeBlock(id: string | null | undefined) {
  return useApp.getState().completeBlock(id);
}
