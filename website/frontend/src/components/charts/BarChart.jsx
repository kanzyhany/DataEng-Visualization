import React, { useMemo } from 'react'
import Plot from 'react-plotly.js'

function BarChart({ data, type = 'borough' }) {
  const chartData = useMemo(() => {
    if (!data || data.length === 0) return { x: [], y: [] }

    let counts = {}

    if (type === 'borough') {
      // Count crashes by borough
      data.forEach(item => {
        const borough = item.borough || 'Unknown'
        counts[borough] = (counts[borough] || 0) + 1
      })
    } else if (type === 'factors') {
      // Count crashes by contributing factor (top 10)
      data.forEach(item => {
        const factor1 = item.contributing_factor_vehicle_1
        const factor2 = item.contributing_factor_vehicle_2
        
        if (factor1 && factor1 !== 'Unknown' && factor1 !== 'Unspecified') {
          counts[factor1] = (counts[factor1] || 0) + 1
        }
        if (factor2 && factor2 !== 'Unknown' && factor2 !== 'Unspecified') {
          counts[factor2] = (counts[factor2] || 0) + 1
        }
      })
      
      // Get top 10
      const sorted = Object.entries(counts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
      counts = Object.fromEntries(sorted)
    }

    const sortedEntries = Object.entries(counts).sort((a, b) => b[1] - a[1])
    const x = sortedEntries.map(([key]) => key)
    const y = sortedEntries.map(([, value]) => value)

    return { x, y }
  }, [data, type])

  const layout = {
    paper_bgcolor: 'rgba(0,0,0,0)',
    plot_bgcolor: 'rgba(0,0,0,0)',
    font: { color: '#ffffff', family: 'Inter, sans-serif' },
    xaxis: {
      title: type === 'borough' ? 'Borough' : 'Contributing Factor',
      gridcolor: 'rgba(255,255,255,0.1)',
      showgrid: true,
      tickangle: type === 'factors' ? -45 : 0,
      automargin: true,
    },
    yaxis: {
      title: 'Number of Crashes',
      gridcolor: 'rgba(255,255,255,0.1)',
      showgrid: true,
    },
    margin: { l: 60, r: 40, t: 40, b: type === 'factors' ? 150 : 80 },
    height: type === 'factors' ? 500 : 450,
    hovermode: 'closest',
  }

  const config = {
    displayModeBar: true,
    displaylogo: false,
    modeBarButtonsToRemove: ['pan2d', 'lasso2d'],
    responsive: true,
  }

  return (
    <Plot
      data={[
        {
          x: chartData.x,
          y: chartData.y,
          type: 'bar',
          marker: {
            color: type === 'borough'
              ? 'rgba(59, 130, 246, 0.8)'
              : 'rgba(147, 51, 234, 0.8)',
            line: {
              color: type === 'borough'
                ? 'rgba(59, 130, 246, 1)'
                : 'rgba(147, 51, 234, 1)',
              width: 1,
            },
          },
          text: chartData.y.map(v => v.toLocaleString()),
          textposition: 'auto',
          hovertemplate: '<b>%{x}</b><br>Crashes: %{y}<extra></extra>',
        },
      ]}
      layout={layout}
      config={config}
      style={{ width: '100%', height: '100%' }}
    />
  )
}

export default BarChart
