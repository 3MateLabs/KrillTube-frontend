/**
 * Revenue Pie Chart
 * Visual representation of revenue distribution
 */

'use client';

interface RevenuePieChartProps {
  creatorPercent: number;
  referrerSharePercent: number;
  platformPercent: number;
}

export function RevenuePieChart({
  creatorPercent,
  referrerSharePercent,
  platformPercent,
}: RevenuePieChartProps) {
  const radius = 70;
  const cx = 80;
  const cy = 80;

  // Helper to get point on circle
  const getPoint = (percent: number) => {
    const angle = (percent / 100) * 2 * Math.PI - Math.PI / 2;
    return {
      x: cx + radius * Math.cos(angle),
      y: cy + radius * Math.sin(angle),
    };
  };

  // Calculate pie slices
  const slices = [
    { label: 'Creator (You)', percent: creatorPercent, color: '#EF4330' }, // krill-orange
    { label: 'Referrer', percent: referrerSharePercent, color: '#C584F6' }, // walrus-grape
    { label: 'Platform', percent: platformPercent, color: '#6B7280' }, // krill-gray
  ];

  let cumulative = 0;

  return (
    <div className="flex flex-col sm:flex-row items-center gap-6">
      {/* Pie Chart */}
      <svg width="160" height="160" viewBox="0 0 160 160" className="flex-shrink-0">
        {slices.map((slice, i) => {
          if (slice.percent === 0) return null;

          const startPercent = cumulative;
          cumulative += slice.percent;
          const endPercent = cumulative;

          const start = getPoint(startPercent);
          const end = getPoint(endPercent);

          const largeArcFlag = slice.percent > 50 ? 1 : 0;

          const pathData = [
            `M ${cx} ${cy}`,
            `L ${start.x} ${start.y}`,
            `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${end.x} ${end.y}`,
            'Z',
          ].join(' ');

          return <path key={i} d={pathData} fill={slice.color} />;
        })}
      </svg>

      {/* Legend */}
      <div className="space-y-3">
        {slices.map((slice) => (
          <div key={slice.label} className="flex items-center gap-2">
            <div
              className="w-4 h-4 rounded shadow-[1px_1px_0_0_rgba(0,0,0,1)] outline outline-1 outline-black"
              style={{ backgroundColor: slice.color }}
            />
            <span className="text-sm text-black font-medium font-['Outfit']">
              {slice.label}: <span className="font-bold">{slice.percent}%</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
