import { formatCurrency } from '@/utils/moneyUtils'

export function createChartOptions() {
  return {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    elements: { point: { hitRadius: 24 } },
    plugins: {
      tooltip: {
        padding: 12,
        titleFont: { size: 13 },
        bodyFont: { size: 14 },
        cornerRadius: 8,
        callbacks: {
          label: context => `${context.dataset.label || ''}: ${formatCurrency(context.parsed.y)}`,
        },
      },
      legend: { labels: { usePointStyle: true, padding: 14, boxWidth: 16, boxHeight: 16 } },
    },
  }
}
