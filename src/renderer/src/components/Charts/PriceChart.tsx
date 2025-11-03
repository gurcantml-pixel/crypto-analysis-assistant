import React, { useEffect, useRef } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface PriceChartProps {
  data: number[];
  labels: string[];
  title: string;
  color?: string;
}

const PriceChart: React.FC<PriceChartProps> = ({ 
  data, 
  labels, 
  title, 
  color = '#fbbf24' 
}) => {
  const chartRef = useRef<ChartJS<'line'>>(null);

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      title: {
        display: true,
        text: title,
        color: '#ffffff',
        font: {
          size: 14,
        },
      },
      tooltip: {
        backgroundColor: 'rgba(31, 41, 55, 0.9)',
        titleColor: '#ffffff',
        bodyColor: '#ffffff',
        borderColor: color,
        borderWidth: 1,
      },
    },
    scales: {
      x: {
        grid: {
          color: 'rgba(75, 85, 99, 0.2)',
        },
        ticks: {
          color: '#9ca3af',
          maxTicksLimit: 8,
        },
      },
      y: {
        grid: {
          color: 'rgba(75, 85, 99, 0.2)',
        },
        ticks: {
          color: '#9ca3af',
          callback: function(value: any) {
            return '$' + value.toLocaleString();
          },
        },
      },
    },
    elements: {
      point: {
        radius: 0,
        hoverRadius: 4,
      },
      line: {
        tension: 0.1,
      },
    },
    interaction: {
      intersect: false,
      mode: 'index' as const,
    },
  };

  const chartData = {
    labels,
    datasets: [
      {
        label: 'Fiyat',
        data,
        borderColor: color,
        backgroundColor: `${color}20`,
        fill: true,
        borderWidth: 2,
      },
    ],
  };

  useEffect(() => {
    const chart = chartRef.current;
    if (chart) {
      chart.update('none');
    }
  }, [data]);

  return (
    <div className="h-64 w-full">
      <Line ref={chartRef} options={options} data={chartData} />
    </div>
  );
};

export default PriceChart;