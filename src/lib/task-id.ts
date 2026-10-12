// Stable checklist task IDs: derived from the task title, not its list position,
// so inserting/reordering guide tasks never moves a farmer's tick.
// Legacy ticks were stored as `${stageId}::${index}`; they are still honoured.

function hash(s: string): string {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
  return h.toString(36);
}

export function stableTaskId(stageId: string, title: string): string {
  return `${stageId}::t${hash(title.trim())}`;
}

export function legacyTaskId(stageId: string, idx: number): string {
  return `${stageId}::${idx}`;
}

export function isTaskDone(
  done: Set<string>,
  stageId: string,
  title: string,
  idx: number,
): boolean {
  return done.has(stableTaskId(stageId, title)) || done.has(legacyTaskId(stageId, idx));
}

/** Legacy index ticks that should be re-saved under their stable ID. */
export function legacyUpgrades(
  done: Set<string>,
  stages: { id: string; tasks: { title: string }[] }[],
): string[] {
  const out: string[] = [];
  for (const s of stages)
    s.tasks.forEach((t, i) => {
      const stable = stableTaskId(s.id, t.title);
      if (done.has(legacyTaskId(s.id, i)) && !done.has(stable)) out.push(stable);
    });
  return out;
}
