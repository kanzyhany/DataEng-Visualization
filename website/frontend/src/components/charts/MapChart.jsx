import React, { useMemo } from 'react';
import Plot from 'react-plotly.js';

function MapChart({ data }) {
	const mapData = useMemo(() => {
		const MAX_POINTS = 1500; // limit markers for performance

		if (!data || data.length === 0) return {
			lat: [], lon: [], sizes: [], colors: [], text: [],
			totalData: 0, totalPoints: 0, availableColumns: [], samples: []
		};

		const availableColumns = Array.from(new Set(data.flatMap(d => Object.keys(d || {}))));

		// helper to try many column names and combined fields
		function extractLatLon(item) {
			if (!item) return { lat: NaN, lon: NaN };

			const tryKeys = (keys) => {
				for (const k of keys) {
					if (Object.prototype.hasOwnProperty.call(item, k)) {
						const v = item[k];
						if (v === null || v === undefined || v === '') continue;
						const num = parseFloat(String(v).replace(/[^0-9+\-\.eE]/g, ''));
						if (!isNaN(num)) return num;
					}
				}
				return NaN;
			};

			// common separate lat/lon keys
			const latKeys = ['latitude','Latitude','LATITUDE','lat','Lat','LAT','y','Y','latitudes','lat_dd','latitude_deg'];
			const lonKeys = ['longitude','Longitude','LONGITUDE','lon','Lon','LON','lng','Lng','x','X','long','longitude_dd','longitude_deg'];

			let lat = tryKeys(latKeys);
			let lon = tryKeys(lonKeys);

			// If not found separately, try to parse combined field like "(40.7, -73.9)", "40.7,-73.9", "POINT (-73.9 40.7)"
			if ((isNaN(lat) || isNaN(lon))) {
				const combinedKeys = ['location','Location','coords','coordinates','coordinate','the_geom','geom','shape','point','latlong','latitude_longitude', 'location_point'];
				for (const k of combinedKeys) {
					if (!Object.prototype.hasOwnProperty.call(item, k)) continue;
					const raw = (item[k] || '').toString();
					if (!raw) continue;
					// find two floats in the string: either lat,lon or lon lat
					const m = raw.match(/(-?\d+\.\d+)\s*,?\s*(-?\d+\.\d+)/);
					if (m) {
						const a = parseFloat(m[1]);
						const b = parseFloat(m[2]);
						if (!isNaN(a) && !isNaN(b)) {
							// heuristic: lat ~40 for NYC, lon ~-73/-74
							if (a > 10 && a < 90 && b < 0 && b > -180) { lat = a; lon = b; break; }
							if (b > 10 && b < 90 && a < 0 && a > -180) { lat = b; lon = a; break; }
						}
					}
					// WKT POINT (lon lat)
					const wkt = raw.match(/POINT\s*\(\s*(-?\d+\.?\d*)\s+(-?\d+\.?\d*)\s*\)/i);
					if (wkt) {
						const a = parseFloat(wkt[1]);
						const b = parseFloat(wkt[2]);
						if (!isNaN(a) && !isNaN(b)) { lon = a; lat = b; break; }
					}
				}
			}

			return { lat: Number(lat), lon: Number(lon) };
		}

		// Build points list
		const points = [];
		for (let i = 0; i < data.length; i++) {
			const item = data[i];
			const { lat, lon } = extractLatLon(item);
			if (isNaN(lat) || isNaN(lon)) continue;
			// quick NYC bounds filter to avoid obvious outliers
			if (lat < 40.0 || lat > 41.2 || lon < -75 || lon > -72) continue;

			const injured = parseInt(item.number_of_persons_injured) || 0;
			const killed = parseInt(item.number_of_persons_killed) || 0;
			const collisionId = item.collision_id ? String(item.collision_id) : null;
			const dateStr = item.crash_datetime ? String(item.crash_datetime).slice(0,10) : '';

			points.push({ lat, lon, injured, killed, collisionId, dateStr, raw: item, idx: i });
		}

		// Deduplicate by collision_id when available, otherwise by lat|lon|date
		const deduped = new Map();
		for (const p of points) {
			const key = p.collisionId ? `id:${p.collisionId}` : `coord:${p.lat.toFixed(6)}|${p.lon.toFixed(6)}|${p.dateStr}`;
			if (!deduped.has(key)) deduped.set(key, p);
		}

		const allPoints = Array.from(deduped.values());

		const totalData = data.length;
		const totalPoints = allPoints.length;

		// If there are too many points, sample but keep all severe ones
		let sampled = allPoints;
		if (allPoints.length > MAX_POINTS) {
			const severe = allPoints.filter(p => p.killed > 0 || p.injured > 0);
			const rest = allPoints.filter(p => p.killed === 0 && p.injured === 0);
			if (severe.length >= MAX_POINTS) {
				sampled = severe.slice(0, MAX_POINTS);
			} else {
				const remaining = MAX_POINTS - severe.length;
				const step = Math.max(1, Math.floor(rest.length / remaining));
				const chosen = [];
				for (let i = 0, cnt = 0; i < rest.length && cnt < remaining; i += step) {
					chosen.push(rest[i]); cnt++;
				}
				sampled = severe.concat(chosen).slice(0, MAX_POINTS);
			}
		}

				const lat = sampled.map(p => p.lat);
				const lon = sampled.map(p => p.lon);
				const sizes = sampled.map(p => 5 + p.injured * 2 + p.killed * 10);
				const colors = sampled.map(p => p.killed > 0 ? 'red' : (p.injured > 0 ? 'orange' : 'yellow'));
				const labels = sampled.map(p => (p.raw && (p.raw.borough || p.raw.Borough || p.raw.borough_name)) || '');
				const text = sampled.map(p => {
					const item = p.raw;
					const injured = p.injured; const killed = p.killed;
					return `Borough: ${item.borough || item.Borough || item.borough_name || 'Unknown'}<br>Injured: ${injured}, Killed: ${killed}<br>Date: ${item.crash_datetime ? new Date(item.crash_datetime).toLocaleDateString() : 'Unknown'}`;
				});

		const samples = allPoints.slice(0, 5).map(p => ({ lat: p.lat, lon: p.lon, injured: p.injured, killed: p.killed }));

		return { lat, lon, sizes, colors, labels, text, totalData, totalPoints, availableColumns, samples };
	}, [data]);

	// small overlay so we can see counts even if plotting area is tricky
	const overlay = (
		<div style={{ position: 'absolute', right: 18, top: 18, zIndex: 10, pointerEvents: 'auto' }}>
			<div className="glass p-2 text-xs text-white/90" style={{ minWidth: 170, textAlign: 'left' }}>
				<div><strong>Records:</strong> {mapData?.totalData ?? 0}</div>
				<div><strong>Valid points:</strong> {mapData?.totalPoints ?? 0}</div>
				<div className="mt-1 text-[10px] text-white/60">Cols: {mapData?.availableColumns?.slice(0,6).join(', ') || 'n/a'}</div>
			</div>
		</div>
	);

	if (!mapData || !mapData.lat || mapData.lat.length === 0) {
		return (
			<div className="flex items-center justify-center h-52 text-white/60 relative">
				{overlay}
				<p>No valid location data available for map</p>
			</div>
		);
	}

	return (
		<div style={{ width: '100%', height: 520, position: 'relative' }}>
			{overlay}
			<Plot
				data={[
					{
						type: 'scattergeo',
						lat: mapData.lat,
						lon: mapData.lon,
						// Show borough labels only when not too many points to avoid clutter
						mode: mapData.lat.length <= 120 ? 'markers+text' : 'markers',
						marker: {
							size: mapData.sizes,
							color: mapData.colors,
							opacity: 0.8,
							line: { color: 'rgba(0, 0, 0, 0.3)', width: 0.6 },
						},
						// small visible labels (boroughs) when dataset is small
						text: mapData.lat.length <= 120 ? mapData.labels : undefined,
						textfont: mapData.lat.length <= 120 ? { size: 10, color: 'white' } : undefined,
						textposition: mapData.lat.length <= 120 ? 'top center' : undefined,
						hovertext: mapData.text,
						hoverinfo: 'text',
					},
				]}
				layout={{
					geo: {
						scope: 'north america',
						projection: { type: 'mercator' },
						domain: { x: [0, 1], y: [0, 1] },
						center: { lat: 40.7128, lon: -74.0060 },
						lonaxis: { range: [-74.5, -73.5] },
						lataxis: { range: [40.3, 41.0] },
						showland: true,
						landcolor: 'rgb(40, 40, 40)',
						bgcolor: 'rgba(0,0,0,0)',
					},
					margin: { l: 0, r: 0, t: 0, b: 0 },
					autosize: true,
					paper_bgcolor: 'rgba(0,0,0,0)',
					plot_bgcolor: 'rgba(0,0,0,0)',
				}}
				config={{ responsive: true, displayModeBar: true, displaylogo: false }}
				style={{ width: '100%', height: '100%' }}
			/>
		</div>
	);
}

export default MapChart;


