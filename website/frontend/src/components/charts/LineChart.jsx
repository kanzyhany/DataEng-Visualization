import React, { useMemo } from 'react'
import Plot from 'react-plotly.js'

function LineChart({ data }) {
  const chartData = useMemo(() => {
    if (!data || data.length === 0) return { dates: [], crashes: [], injured: [], killed: [] }

    const dateCounts = {}
    const injuredCounts = {}
    const killedCounts = {}

    // Calculate crash-level sums (same logic as Dashboard)
    const crashInjuredSum = data.reduce((sum, d) => {
      const val = d.number_of_persons_injured
      if (val === null || val === undefined || val === '') return sum
      const num = typeof val === 'string' ? parseFloat(val) : Number(val)
      return sum + (isNaN(num) ? 0 : num)
    }, 0)

    const crashKilledSum = data.reduce((sum, d) => {
      const val = d.number_of_persons_killed
      if (val === null || val === undefined || val === '') return sum
      const num = typeof val === 'string' ? parseFloat(val) : Number(val)
      return sum + (isNaN(num) ? 0 : num)
    }, 0)

    // Use crash-level counts if available, otherwise use person-level
    const useCrashLevel = crashInjuredSum > 0 || crashKilledSum > 0

    data.forEach(item => {
      if (item.crash_datetime) {
        const date = new Date(item.crash_datetime)
        if (!isNaN(date.getTime())) {
          // Group by month-year
          const monthYear = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
          
          dateCounts[monthYear] = (dateCounts[monthYear] || 0) + 1
          
          if (useCrashLevel) {
            // Use crash-level counts (same as Dashboard)
            const injuredVal = item.number_of_persons_injured
            if (injuredVal !== null && injuredVal !== undefined && injuredVal !== '') {
              const injured = typeof injuredVal === 'string' ? parseFloat(injuredVal) : Number(injuredVal)
              if (!isNaN(injured)) {
                injuredCounts[monthYear] = (injuredCounts[monthYear] || 0) + injured
              }
            }
            
            const killedVal = item.number_of_persons_killed
            if (killedVal !== null && killedVal !== undefined && killedVal !== '') {
              const killed = typeof killedVal === 'string' ? parseFloat(killedVal) : Number(killedVal)
              if (!isNaN(killed)) {
                killedCounts[monthYear] = (killedCounts[monthYear] || 0) + killed
              }
            }
          } else {
            // Fallback: count person-level `person_injury` records (same as Dashboard)
            const pi = item.person_injury
            if (pi) {
              const s = pi.toString().toLowerCase()
              if (s.includes('injur')) {
                injuredCounts[monthYear] = (injuredCounts[monthYear] || 0) + 1
              }
              if (s.includes('kill') || s.includes('death')) {
                killedCounts[monthYear] = (killedCounts[monthYear] || 0) + 1
              }
            }
          }
        }
      }
    })

    const sortedDates = Object.keys(dateCounts).sort()
    const crashes = sortedDates.map(date => dateCounts[date])
    const injured = sortedDates.map(date => injuredCounts[date] || 0)
    const killed = sortedDates.map(date => killedCounts[date] || 0)

    return { dates: sortedDates, crashes, injured, killed }
  }, [data])

  const layout = {
    paper_bgcolor: 'rgba(0,0,0,0)',
    plot_bgcolor: 'rgba(0,0,0,0)',
    font: { color: '#ffffff', family: 'Inter, sans-serif' },
    xaxis: {
      title: 'Month',
      gridcolor: 'rgba(255,255,255,0.1)',
      showgrid: true,
    },
    yaxis: {
      title: 'Count',
      gridcolor: 'rgba(255,255,255,0.1)',
      showgrid: true,
    },
    margin: { l: 60, r: 40, t: 40, b: 60 },
    height: 400,
    hovermode: 'x unified',
    hoverlabel: {
      bgcolor: 'rgba(0, 0, 0, 0.9)',
      bordercolor: 'rgba(255, 255, 255, 0.5)',
      font: { color: '#ffffff', family: 'Inter, sans-serif', size: 12 },
      align: 'left',
    },
    hoverdistance: 20,
    legend: {
      x: 0,
      y: 1,
      font: { color: '#ffffff' },
    },
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
          x: chartData.dates,
          y: chartData.crashes,
          type: 'scatter',
          mode: 'lines+markers',
          name: 'Total Crashes',
          line: { color: 'rgba(59, 130, 246, 1)', width: 3 },
          marker: { size: 6, color: 'rgba(59, 130, 246, 1)' },
          hovertemplate: '%{fullData.name}: %{y}<extra></extra>',
        },
        {
          x: chartData.dates,
          y: chartData.injured,
          type: 'scatter',
          mode: 'lines+markers',
          name: 'Injured',
          line: { color: 'rgba(251, 146, 60, 1)', width: 3 },
          marker: { size: 6, color: 'rgba(251, 146, 60, 1)' },
          hovertemplate: '%{fullData.name}: %{y}<extra></extra>',
        },
        {
          x: chartData.dates,
          y: chartData.killed,
          type: 'scatter',
          mode: 'lines+markers',
          name: 'Fatalities',
          line: { color: 'rgba(239, 68, 68, 1)', width: 3 },
          marker: { size: 6, color: 'rgba(239, 68, 68, 1)' },
          hovertemplate: '%{fullData.name}: %{y}<extra></extra>',
        },
      ]}
      layout={layout}
      config={config}
      style={{ width: '100%', height: '100%' }}
    />
  )
}

export default LineChart
