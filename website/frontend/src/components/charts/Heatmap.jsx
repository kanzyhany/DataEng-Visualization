import React, { useMemo } from 'react'
import Plot from 'react-plotly.js'

function Heatmap({ data }) {
  const chartData = useMemo(() => {
    if (!data || data.length === 0) return { z: [], x: [], y: [] }

    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    const boroughs = ['Brooklyn', 'Queens', 'Manhattan', 'Bronx', 'Staten Island', 'Unknown']
    const counts = {}

    // Initialize counts
    boroughs.forEach(borough => {
      counts[borough] = {}
      monthNames.forEach(month => {
        counts[borough][month] = 0
      })
    })

    // Count crashes by borough and month
    data.forEach(item => {
      if (item.crash_datetime) {
        const date = new Date(item.crash_datetime)
        if (!isNaN(date.getTime())) {
          const month = monthNames[date.getMonth()]
          const borough = item.borough || 'Unknown'
          
          if (counts[borough] && counts[borough][month] !== undefined) {
            counts[borough][month]++
          }
        }
      }
    })

    // Build z matrix (values)
    const z = boroughs.map(borough => 
      monthNames.map(month => counts[borough][month] || 0)
    )

    return { z, x: monthNames, y: boroughs }
  }, [data])

  const layout = {
    paper_bgcolor: 'rgba(0,0,0,0)',
    plot_bgcolor: 'rgba(0,0,0,0)',
    font: { color: '#ffffff', family: 'Inter, sans-serif' },
    xaxis: {
      title: 'Month',
      gridcolor: 'rgba(255,255,255,0.1)',
    },
    yaxis: {
      title: 'Borough',
      gridcolor: 'rgba(255,255,255,0.1)',
    },
    margin: { l: 100, r: 40, t: 40, b: 60 },
    height: 400,
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
          z: chartData.z,
          x: chartData.x,
          y: chartData.y,
          type: 'heatmap',
          colorscale: [
            [0, 'rgba(30, 58, 138, 0.3)'],
            [0.25, 'rgba(59, 130, 246, 0.5)'],
            [0.5, 'rgba(147, 51, 234, 0.7)'],
            [0.75, 'rgba(236, 72, 153, 0.8)'],
            [1, 'rgba(239, 68, 68, 1)'],
          ],
          showscale: true,
          colorbar: {
            title: 'Crashes',
            titlefont: { color: '#ffffff' },
            tickfont: { color: '#ffffff' },
          },
          hovertemplate: '<b>%{y}</b><br>Month: %{x}<br>Crashes: %{z}<extra></extra>',
        },
      ]}
      layout={layout}
      config={config}
      style={{ width: '100%', height: '100%' }}
    />
  )
}

export default Heatmap
