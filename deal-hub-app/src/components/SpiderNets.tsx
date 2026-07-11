'use client';
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer } from 'recharts';

export default function SpiderNets({ quant, qual }: { quant: { axis: string; value: number }[]; qual: { axis: string; value: number }[] }) {
  const net = (data: { axis: string; value: number }[], color: string, title: string) => (
    <div>
      <div className="text-center text-[11px] text-neutral-500 mb-1">{title}</div>
      {data.length === 0 ? <div className="h-[240px] flex items-center justify-center text-xs text-neutral-400">No scores yet</div> : (
        <ResponsiveContainer width="100%" height={240}>
          <RadarChart data={data.map((d) => ({ axis: d.axis.length > 14 ? d.axis.slice(0, 13) + '…' : d.axis, value: d.value }))} outerRadius={85}>
            <PolarGrid /><PolarAngleAxis dataKey="axis" tick={{ fontSize: 8 }} /><PolarRadiusAxis domain={[0, 5]} tick={{ fontSize: 8 }} />
            <Radar dataKey="value" stroke={color} fill={color} fillOpacity={0.2} />
          </RadarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
  return <div className="grid grid-cols-2 gap-4">{net(quant, '#2b5ea7', 'QUANTITATIVE')}{net(qual, '#1a7a5a', 'QUALITATIVE')}</div>;
}
