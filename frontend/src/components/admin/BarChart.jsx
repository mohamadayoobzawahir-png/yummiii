// A simple one-series bar chart: one colour, no legend, a tooltip on each bar,
// and a table version for screen readers / exact numbers.
//   data: [{ label: 'Mon', value: 2500, tip: 'Mon: Rs. 2,500 · 3 orders' }, ...]
//   valueIndex: which bar shows its value above it (e.g. today); others show it on hover
function BarChart({ data, valueIndex, formatValue = (v) => v, title }) {
  const max = Math.max(...data.map((d) => d.value), 1)   // 1: avoid dividing by 0
  // Many bars (24 hours, 31 days) → only label every few, so the labels don't overlap
  const labelEvery = data.length > 12 ? Math.ceil(data.length / 8) : 1

  return (
    <>
      <div
        className="bar-chart"
        style={{ gridTemplateColumns: `repeat(${data.length}, 1fr)` }}
        role="img"
        aria-label={`${title}. A table version is below.`}
      >
        {data.map((d, index) => (
          // The whole column is the hover target (bigger than the bar itself)
          <div className="bar-col" key={index} data-tip={d.tip} tabIndex={0} aria-label={d.tip}>
            <span className="bar-value">{index === valueIndex && d.value > 0 ? formatValue(d.value) : ''}</span>
            <div className="bar" style={{ height: `${(d.value / max) * 100}%` }} />
            {(index % labelEvery === 0 || index === data.length - 1) && <span className="bar-label">{d.label}</span>}
          </div>
        ))}
      </div>
      <details className="chart-table">
        <summary>View as table</summary>
        <table>
          <tbody>
            {data.map((d, index) => <tr key={index}><td>{d.tip}</td></tr>)}
          </tbody>
        </table>
      </details>
    </>
  )
}

export default BarChart
