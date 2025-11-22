import React, { useMemo } from 'react'
import Plot from 'react-plotly.js'

function PieChart({ data, filters }) {
  const { chartData, hasSingleItem } = useMemo(() => {
    if (!data || data.length === 0) return { chartData: { labels: [], values: [] }, hasSingleItem: false }

    const counts = {}
    const activeVehicleFilters = filters?.vehicle_type || []

    console.log('PieChart - Active vehicle filters:', activeVehicleFilters)
    console.log('PieChart - Total records:', data.length)

    // Assign exactly one vehicle category per row: prefer vehicle_type_code_1, fallback to vehicle_type_code_2
    const filterSet = new Set((activeVehicleFilters || []).map(s => String(s)));
    for (let i = 0; i < data.length; i++) {
      const item = data[i]
      const rawV1 = item.vehicle_type_code_1
      const rawV2 = item.vehicle_type_code_2

      // normalize and pick the primary vehicle for this row
      const v1 = rawV1 && String(rawV1).trim()
      const v2 = rawV2 && String(rawV2).trim()
      let chosen = null
      if (v1 && v1 !== 'Unknown' && v1 !== 'Unspecified' && v1 !== '') chosen = v1
      else if (v2 && v2 !== 'Unknown' && v2 !== 'Unspecified' && v2 !== '') chosen = v2
      else chosen = 'Unknown'

      // If vehicle filters are active, include matching rows as their chosen category
      // and place non-matching rows into an 'Other' bucket so the pie sums to total records.
      if (activeVehicleFilters.length > 0) {
        if (filterSet.has(String(chosen))) {
          counts[chosen] = (counts[chosen] || 0) + 1
        } else {
          counts['Other'] = (counts['Other'] || 0) + 1
        }
      } else {
        counts[chosen] = (counts[chosen] || 0) + 1
      }
    }

    console.log('PieChart vehicle counts:', counts)

    // Get top entries efficiently
    const entries = Object.entries(counts)
    entries.sort((a, b) => b[1] - a[1])

    // Group small categories into "Other" if too many
    let displayEntries
    if (entries.length > 8) {
      const topEntries = entries.slice(0, 7)
      const otherCount = entries.slice(7).reduce((sum, [, count]) => sum + count, 0)
      displayEntries = [...topEntries, ['Other', otherCount]]
    } else {
      displayEntries = entries
    }

    // Filter out zero counts
    displayEntries = displayEntries.filter(([, count]) => count > 0)

    const labels = displayEntries.map(([key]) => key)
    const values = displayEntries.map(([, value]) => value)

    return {
      chartData: { labels, values },
      hasSingleItem: labels.length === 1
    }
  }, [data, filters])

  const colors = [
    'rgba(59, 130, 246, 0.8)',   // blue
    'rgba(147, 51, 234, 0.8)',   // purple
    'rgba(236, 72, 153, 0.8)',   // pink
    'rgba(34, 197, 94, 0.8)',    // green
    'rgba(251, 146, 60, 0.8)',   // orange
    'rgba(239, 68, 68, 0.8)',    // red
    'rgba(168, 85, 247, 0.8)',   // violet
    'rgba(14, 165, 233, 0.8)',   // sky
  ]

  const layout = useMemo(() => ({
    paper_bgcolor: 'rgba(0,0,0,0)',
    plot_bgcolor: 'rgba(0,0,0,0)',
    font: { 
      color: '#ffffff', 
      family: 'Inter, sans-serif', 
      size: hasSingleItem ? 14 : 12 
    },
    margin: { 
      l: 40, 
      r: 40, 
      t: 60, 
      b: hasSingleItem ? 80 : 120 
    },
    height: 500,
    showlegend: true,
    legend: {
      x: 0.5,
      y: hasSingleItem ? -0.15 : -0.25,
      xanchor: 'center',
      yanchor: 'top',
      orientation: 'h',
      font: { 
        color: '#ffffff', 
        size: hasSingleItem ? 14 : 11 
      },
      bgcolor: 'rgba(0,0,0,0.5)',
      bordercolor: 'rgba(255,255,255,0.3)',
      borderwidth: 1,
    },
    annotations: hasSingleItem && chartData.labels.length > 0 ? [
      {
        text: `<b>${chartData.labels[0]}</b><br>${chartData.values[0].toLocaleString()} crashes`,
        x: 0.5,
        y: 0.5,
        font: { size: 16, color: '#ffffff', family: 'Inter, sans-serif' },
        showarrow: false,
        align: 'center',
        bgcolor: 'rgba(0,0,0,0.7)',
        bordercolor: 'rgba(255,255,255,0.4)',
        borderwidth: 2,
        borderpad: 12,
      }
    ] : undefined
  }), [chartData, hasSingleItem])

  const config = {
    displayModeBar: true,
    displaylogo: false,
    modeBarButtonsToRemove: ['pan2d', 'lasso2d', 'select2d'],
    responsive: true,
  }

  // Don't render the chart if there's no data
  if (chartData.labels.length === 0 || chartData.values.reduce((sum, val) => sum + val, 0) === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-white/70">
        <div className="text-center">
          <div className="text-4xl mb-2">📊</div>
          <p>No vehicle type data available</p>
          <p className="text-sm">Try different filters</p>
        </div>
      </div>
    )
  }

  return (
    <Plot
      data={[
        {
          labels: chartData.labels,
          values: chartData.values,
          type: 'pie',
          marker: {
            colors: colors.slice(0, chartData.labels.length),
            line: {
              color: 'rgba(255,255,255,0.4)',
              width: 2,
            },
          },
          textinfo: hasSingleItem ? 'none' : 'percent',
          textposition: hasSingleItem ? 'none' : 'inside',
          hovertemplate: '<b>%{label}</b><br>Crashes: %{value}<br>Percentage: %{percent}<extra></extra>',
          hole: hasSingleItem ? 0.6 : 0.4,
          insidetextorientation: 'horizontal',
          insidetextfont: {
            color: '#ffffff',
            size: 11,
            family: 'Inter, sans-serif'
          },
        },
      ]}
      layout={layout}
      config={config}
      style={{ width: '100%', height: '100%' }}
    />
  )
}

export default PieChart