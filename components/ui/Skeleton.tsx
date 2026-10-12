/**
 * Placeholders shaped like the content they stand in for.
 *
 * A spinner says "wait"; a skeleton says "wait, and here is what is
 * coming". For a table that matters twice over: the reader already knows
 * where to look when the rows land, and the page does not jump when a
 * centred spinner is replaced by a full-width table.
 *
 * The whole block is one `status` with a single label. Announcing each bar
 * would flood a screen reader with noise that means nothing; the bars
 * themselves are hidden from the tree.
 */
export function Skeleton({ className = "", style }: { className?: string; style?: React.CSSProperties }) {
  return <span className={`skeleton ${className}`.trim()} style={style} aria-hidden="true" />;
}

export function TableSkeleton({
  columns,
  rows = 6,
  label
}: {
  columns: number;
  rows?: number;
  label: string;
}) {
  // Uneven widths, held stable per column so the placeholder does not
  // reshuffle on every render. Rows of identical bars read as a loading
  // graphic; rows of varied ones read as text that has not arrived.
  const widths = ["72%", "54%", "63%", "45%", "68%", "50%"];

  return (
    <div className="table-wrap" role="status" aria-busy="true" aria-label={label}>
      <table className="data-table" aria-hidden="true">
        <tbody>
          {Array.from({ length: rows }, (_, rowIndex) => (
            <tr key={rowIndex}>
              {Array.from({ length: columns }, (_, columnIndex) => (
                <td key={columnIndex}>
                  <Skeleton style={{ width: widths[columnIndex % widths.length] }} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
