import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  Line,
  LineChart,
  ZAxis,
  Cell,
} from 'recharts';
import type { ChartConfig } from '../types';

const COLORS = [
  '#2563eb',
  '#de3a11',
  '#059669',
  '#7c3aed',
  '#f97316',
  '#0ea5e9',
  '#facc15',
  '#db2777',
];

interface ChartRendererProps {
  config: ChartConfig;
}

const axisTypeForValues = (
  data: Array<Record<string, unknown>>,
  key: string,
): 'number' | 'category' => {
  const sample = data.find((row) => row[key] != null)?.[key];
  return typeof sample === 'number' ? 'number' : 'category';
};

const renderCartesian = (
  config: ChartConfig,
  chart: 'bar' | 'line' | 'area' | 'scatter',
) => {
  const { xKey, yKeys, data } = config;
  if (chart === 'scatter') {
    const yKey = yKeys[0];
    const zKey = yKeys[1];
    return (
      <ScatterChart>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis
          dataKey={xKey}
          type={axisTypeForValues(data, xKey)}
          name={xKey}
        />
        <YAxis
          dataKey={yKey}
          name={yKey}
          type={axisTypeForValues(data, yKey)}
        />
        {zKey ? <ZAxis dataKey={zKey} name={zKey} /> : null}
        <Tooltip cursor={{ strokeDasharray: '3 3' }} />
        <Scatter data={data} fill={COLORS[0]} />
      </ScatterChart>
    );
  }
  const sharedAxes = (
    <>
      <CartesianGrid strokeDasharray="3 3" />
      <XAxis dataKey={xKey} />
      <YAxis />
      <Tooltip />
      {yKeys.length > 1 ? <Legend /> : null}
    </>
  );

  if (chart === 'bar') {
    return (
      <BarChart data={data}>
        {sharedAxes}
        {yKeys.map((key, index) => (
          <Bar key={key} dataKey={key} fill={COLORS[index % COLORS.length]} />
        ))}
      </BarChart>
    );
  }

  if (chart === 'line') {
    return (
      <LineChart data={data}>
        {sharedAxes}
        {yKeys.map((key, index) => (
          <Line
            key={key}
            type="monotone"
            dataKey={key}
            stroke={COLORS[index % COLORS.length]}
            strokeWidth={2}
            dot={data.length <= 30}
          />
        ))}
      </LineChart>
    );
  }

  if (chart === 'area') {
    return (
      <AreaChart data={data}>
        {sharedAxes}
        {yKeys.map((key, index) => (
          <Area
            key={key}
            type="monotone"
            dataKey={key}
            stroke={COLORS[index % COLORS.length]}
            fill={COLORS[index % COLORS.length]}
            fillOpacity={0.3}
          />
        ))}
      </AreaChart>
    );
  }

  return null;
};

const ChartRenderer = ({ config }: ChartRendererProps) => {
  if (!config.data.length) {
    return <p>No data to visualize.</p>;
  }

  if (config.type === 'pie') {
    const valueKey = config.yKeys[0];
    return (
      <ResponsiveContainer width="100%" height={360}>
        <PieChart>
          <Tooltip />
          <Legend />
          <Pie
            dataKey={valueKey}
            nameKey={config.xKey}
            data={config.data}
            outerRadius={140}
            fill={COLORS[0]}
            label
          >
            {config.data.map((_, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={360}>
      {renderCartesian(
        config,
        config.type === 'scatter' ? 'scatter' : config.type,
      )}
    </ResponsiveContainer>
  );
};

export default ChartRenderer;
