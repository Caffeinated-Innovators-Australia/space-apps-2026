// AI assistance: drafted with Claude Code (see AI_USE.md).
type Row = { what: string; you: string; medic: string; surgeon: string; crew: string };

export function PrivacyTable({ rows, status }: { rows: Row[]; status: string }) {
  return (
    <div className="card x-privacy">
      <h2 className="title">Who sees what</h2>
      <table className="x-ptable">
        <thead>
          <tr><th scope="col"><span className="x-sr">Information</span></th><th scope="col">You</th><th scope="col">Crew medic</th><th scope="col">Flight surgeon</th><th scope="col">Rest of crew</th></tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.what}>
              <th scope="row">{r.what}</th>
              <td data-label="You">{r.you}</td>
              <td data-label="Crew medic">{r.medic}</td>
              <td data-label="Flight surgeon">{r.surgeon}</td>
              <td data-label="Rest of crew">{r.crew}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <span className={/^(Reviewed|Approved)/.test(status) ? 'source' : 'placeholder'}>{status}</span>
    </div>
  );
}
