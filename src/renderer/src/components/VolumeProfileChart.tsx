import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import { VolumeProfile } from '../types';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

interface Props {
  profile: VolumeProfile;
  maxLevels?: number;
}

const VolumeProfileChart: React.FC<Props> = ({ profile, maxLevels = 30 }) => {
  if (!profile || !profile.levels || profile.levels.length === 0) return null;

  const levels = profile.levels.slice(0, maxLevels).slice().reverse(); // reverse for y-axis (largest on bottom)
  const labels = levels.map(l => l.price.toFixed(l.price < 1 ? 4 : 2));
  const dataValues = levels.map(l => l.volume);

  const pocPrice = profile.poc;

  const data = {
    labels,
    datasets: [
      {
        label: 'Hacim',
        data: dataValues,
        backgroundColor: levels.map(l => (l.price === pocPrice ? 'rgba(34,197,94,0.9)' : 'rgba(59,130,246,0.7)')),
        borderRadius: 6,
        barThickness: 12
      }
    ]
  };

  const options: any = {
    indexAxis: 'y',
    scales: {
      x: {
        ticks: {
          callback: (val: any) => {
            // Show abbreviated numbers for volumes
            const num = Number(val);
            if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
            if (num >= 1000) return (num / 1000).toFixed(1) + 'k';
            return num;
          }
        }
      }
    },
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (context: any) => {
            const vol = context.raw;
            return `Hacim: ${vol}`;
          },
          title: (contexts: any) => {
            // show price as title
            const idx = contexts[0].dataIndex;
            return `Fiyat: ${labels[idx]}`;
          }
        }
      }
    },
    maintainAspectRatio: false
  };

  return (
    <div className="h-72">
      <Bar data={data} options={options} />
    </div>
  );
};

export default VolumeProfileChart;
