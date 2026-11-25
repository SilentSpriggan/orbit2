/** Preserve server-declared evidence limits when text leaves the rendered answer. */
export function annotateUnsupported(
  answer: string,
  spans: [number, number][],
): string {
  const merged: [number, number][] = [];
  for (const [rawStart, rawEnd] of [...spans].sort((a, b) => a[0] - b[0])) {
    const start = Math.max(0, rawStart);
    const end = Math.min(answer.length, rawEnd);
    if (end <= start) continue;
    const previous = merged.at(-1);
    if (previous && start <= previous[1])
      previous[1] = Math.max(previous[1], end);
    else merged.push([start, end]);
  }
  let result = "",
    from = 0;
  for (const [start, end] of merged) {
    result +=
      answer.slice(from, start) +
      "[Not supported by a retrieved passage: " +
      answer.slice(start, end) +
      "]";
    from = end;
  }
  return result + answer.slice(from);
}
