// State management
const state = {
    filters: {
        borough: [],
        year: [],
        vehicle_type: [],
        contributing_factor: [],
        injury_type: []
    },
    filterOptions: {},
    data: []
};

// Plotly layout defaults
const layoutDefaults = {
    paper_bgcolor: 'rgba(0,0,0,0)',
    plot_bgcolor: 'rgba(0,0,0,0)',
    font: { color: 'white', size: 11 },
    margin: { l: 50, r: 30, t: 30, b: 50 },
    showlegend: false
};

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    loadFilters();

    // Close dropdowns when clicking outside
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.relative')) {
            document.querySelectorAll('[id$="-dropdown"]').forEach(d => d.classList.add('hidden'));
        }
    });

    // Search input handling
    const searchInput = document.getElementById('search-input');
    searchInput.addEventListener('input', () => {
        document.getElementById('clear-search').classList.toggle('hidden', !searchInput.value);
    });
});

// Load filter options from API
async function loadFilters() {
    try {
        const response = await fetch('/api/filters');
        const data = await response.json();
        state.filterOptions = data;

        populateDropdown('borough', data.boroughs || []);
        populateDropdown('year', data.years || []);
        populateDropdown('vehicle_type', data.vehicle_types || []);
        populateDropdown('contributing_factor', data.contributing_factors || []);
        populateDropdown('injury_type', data.injury_types || []);
    } catch (error) {
        console.error('Error loading filters:', error);
    }
}

// Populate a filter dropdown
function populateDropdown(key, options) {
    const dropdown = document.getElementById(`${key}-dropdown`);
    dropdown.innerHTML = options.map(opt => `
        <label class="flex items-center gap-2 p-1 hover:bg-white/10 rounded cursor-pointer">
            <input type="checkbox" value="${opt}" onchange="updateFilter('${key}', '${opt}')"
                class="rounded border-gray-400">
            <span class="text-sm truncate">${opt}</span>
        </label>
    `).join('');
}

// Toggle dropdown visibility
function toggleDropdown(key) {
    const dropdown = document.getElementById(`${key}-dropdown`);
    const wasHidden = dropdown.classList.contains('hidden');

    // Close all dropdowns
    document.querySelectorAll('[id$="-dropdown"]').forEach(d => d.classList.add('hidden'));

    // Open this one if it was closed
    if (wasHidden) {
        dropdown.classList.remove('hidden');
    }
}

// Update filter state
function updateFilter(key, value) {
    const index = state.filters[key].indexOf(value);
    if (index === -1) {
        state.filters[key].push(value);
    } else {
        state.filters[key].splice(index, 1);
    }
    updateFilterCounts();
    updateActiveFilters();
}

// Update filter count badges
function updateFilterCounts() {
    Object.keys(state.filters).forEach(key => {
        const count = state.filters[key].length;
        const badge = document.getElementById(`${key}-count`);
        badge.textContent = count;
        badge.classList.toggle('hidden', count === 0);
    });
}

// Update active filters display
function updateActiveFilters() {
    const container = document.getElementById('active-filters');
    const allFilters = Object.entries(state.filters)
        .flatMap(([key, values]) => values.map(v => ({ key, value: v })));

    if (allFilters.length === 0) {
        container.classList.add('hidden');
        return;
    }

    container.classList.remove('hidden');
    container.innerHTML = allFilters.map(({ key, value }) => `
        <span class="bg-teal-600/50 px-3 py-1 rounded-full text-sm flex items-center gap-2">
            ${value}
            <button onclick="removeFilter('${key}', '${value}')" class="hover:text-rose-400">&times;</button>
        </span>
    `).join('');
}

// Remove a specific filter
function removeFilter(key, value) {
    const index = state.filters[key].indexOf(value);
    if (index > -1) {
        state.filters[key].splice(index, 1);

        // Uncheck the checkbox
        const dropdown = document.getElementById(`${key}-dropdown`);
        const checkbox = dropdown.querySelector(`input[value="${value}"]`);
        if (checkbox) checkbox.checked = false;

        updateFilterCounts();
        updateActiveFilters();
    }
}

// Clear all filters
function clearAllFilters() {
    Object.keys(state.filters).forEach(key => {
        state.filters[key] = [];
        const dropdown = document.getElementById(`${key}-dropdown`);
        dropdown.querySelectorAll('input').forEach(cb => cb.checked = false);
    });
    document.getElementById('search-input').value = '';
    document.getElementById('clear-search').classList.add('hidden');
    updateFilterCounts();
    updateActiveFilters();
}

// Clear search
function clearSearch() {
    document.getElementById('search-input').value = '';
    document.getElementById('clear-search').classList.add('hidden');
}

// Generate report
async function generateReport() {
    const btn = document.getElementById('generate-btn');
    const btnText = document.getElementById('btn-text');
    const btnSpinner = document.getElementById('btn-spinner');

    // Show loading state
    btn.disabled = true;
    btnText.textContent = 'Generating...';
    btnSpinner.classList.remove('hidden');

    document.getElementById('initial-state').classList.add('hidden');
    document.getElementById('empty-state').classList.add('hidden');
    document.getElementById('dashboard-content').classList.add('hidden');
    document.getElementById('loading-state').classList.remove('hidden');

    try {
        const payload = {
            ...state.filters,
            search: document.getElementById('search-input').value
        };

        const response = await fetch('/api/data', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const result = await response.json();
        state.data = result.data || [];

        document.getElementById('loading-state').classList.add('hidden');

        if (state.data.length === 0) {
            document.getElementById('empty-state').classList.remove('hidden');
        } else {
            document.getElementById('dashboard-content').classList.remove('hidden');
            document.getElementById('records-count').textContent = `${state.data.length.toLocaleString()} records found`;
            renderDashboard();
        }
    } catch (error) {
        console.error('Error generating report:', error);
        document.getElementById('loading-state').classList.add('hidden');
        document.getElementById('empty-state').classList.remove('hidden');
    } finally {
        btn.disabled = false;
        btnText.textContent = 'Generate Report';
        btnSpinner.classList.add('hidden');
    }
}

// Render all dashboard components
function renderDashboard() {
    updateStats();
    renderBoroughChart();
    renderVehicleChart();
    renderTimelineChart();
    renderFactorsChart();
    renderHeatmap();
    renderMap();
}

// Update stat cards
function updateStats() {
    const data = state.data;

    // Total crashes (rows)
    document.getElementById('stat-crashes').textContent = data.length.toLocaleString();

    // Unique collisions
    const uniqueCollisions = new Set(data.map(d => d.collision_id)).size;
    document.getElementById('stat-collisions').textContent = uniqueCollisions.toLocaleString();

    // Count injured and killed from person_injury field
    let injured = 0, killed = 0;
    data.forEach(d => {
        const injury = (d.person_injury || '').toLowerCase();
        if (injury === 'injured') injured++;
        if (injury === 'killed') killed++;
    });

    document.getElementById('stat-injured').textContent = injured.toLocaleString();
    document.getElementById('stat-killed').textContent = killed.toLocaleString();
}

// Borough bar chart
function renderBoroughChart() {
    const counts = {};
    state.data.forEach(d => {
        const borough = d.borough || 'Unknown';
        counts[borough] = (counts[borough] || 0) + 1;
    });

    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);

    Plotly.newPlot('chart-borough', [{
        x: sorted.map(s => s[0]),
        y: sorted.map(s => s[1]),
        type: 'bar',
        marker: { color: '#0d9488' }
    }], {
        ...layoutDefaults,
        xaxis: { tickangle: -45 }
    }, { responsive: true });
}

// Vehicle type pie chart
function renderVehicleChart() {
    const counts = {};
    state.data.forEach(d => {
        const type = d.vehicle_type_code_1 || 'Unknown';
        if (type && type !== 'Unknown') {
            counts[type] = (counts[type] || 0) + 1;
        }
    });

    // Get top 8 and group rest as "Other"
    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    const top = sorted.slice(0, 8);
    const other = sorted.slice(8).reduce((sum, [, v]) => sum + v, 0);
    if (other > 0) top.push(['Other', other]);

    Plotly.newPlot('chart-vehicle', [{
        labels: top.map(t => t[0]),
        values: top.map(t => t[1]),
        type: 'pie',
        hole: 0.4,
        marker: {
            colors: ['#0d9488', '#06b6d4', '#0ea5e9', '#6366f1', '#8b5cf6', '#10b981', '#f59e0b', '#f97316', '#94a3b8']
        }
    }], {
        ...layoutDefaults,
        showlegend: true,
        legend: { orientation: 'h', y: -0.2 }
    }, { responsive: true });
}

// Timeline line chart
function renderTimelineChart() {
    // First, aggregate by collision_id to avoid double counting
    const collisionData = {};
    state.data.forEach(d => {
        const id = d.collision_id;
        if (!collisionData[id]) {
            collisionData[id] = {
                crash_datetime: d.crash_datetime,
                injured: parseFloat(d.number_of_persons_injured) || 0,
                killed: parseFloat(d.number_of_persons_killed) || 0
            };
        }
    });

    // Then aggregate by month
    const monthly = {};
    Object.values(collisionData).forEach(d => {
        if (!d.crash_datetime) return;
        const date = new Date(d.crash_datetime);
        const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

        if (!monthly[key]) {
            monthly[key] = { crashes: 0, injured: 0, killed: 0 };
        }
        monthly[key].crashes++;
        monthly[key].injured += d.injured;
        monthly[key].killed += d.killed;
    });

    const sorted = Object.entries(monthly).sort((a, b) => a[0].localeCompare(b[0]));
    const dates = sorted.map(s => s[0]);

    Plotly.newPlot('chart-timeline', [
        {
            x: dates,
            y: sorted.map(s => s[1].crashes),
            name: 'Crashes',
            type: 'scatter',
            mode: 'lines',
            line: { color: '#06b6d4' }
        },
        {
            x: dates,
            y: sorted.map(s => s[1].injured),
            name: 'Injured',
            type: 'scatter',
            mode: 'lines',
            line: { color: '#f59e0b' }
        },
        {
            x: dates,
            y: sorted.map(s => s[1].killed),
            name: 'Killed',
            type: 'scatter',
            mode: 'lines',
            line: { color: '#fb7185' }
        }
    ], {
        ...layoutDefaults,
        showlegend: true,
        legend: { orientation: 'h', y: 1.1 }
    }, { responsive: true });
}

// Contributing factors bar chart
function renderFactorsChart() {
    const counts = {};
    state.data.forEach(d => {
        const factor = d.contributing_factor_vehicle_1;
        if (factor && factor !== 'Unspecified') {
            counts[factor] = (counts[factor] || 0) + 1;
        }
    });

    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 10);

    Plotly.newPlot('chart-factors', [{
        y: sorted.map(s => s[0]),
        x: sorted.map(s => s[1]),
        type: 'bar',
        orientation: 'h',
        marker: { color: '#14b8a6' }
    }], {
        ...layoutDefaults,
        margin: { l: 200, r: 30, t: 30, b: 50 }
    }, { responsive: true });
}

// Heatmap
function renderHeatmap() {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const boroughs = [...new Set(state.data.map(d => d.borough).filter(b => b))];

    const heatData = boroughs.map(borough => {
        return months.map((_, monthIdx) => {
            return state.data.filter(d => {
                if (d.borough !== borough || !d.crash_datetime) return false;
                const date = new Date(d.crash_datetime);
                return date.getMonth() === monthIdx;
            }).length;
        });
    });

    Plotly.newPlot('chart-heatmap', [{
        z: heatData,
        x: months,
        y: boroughs,
        type: 'heatmap',
        colorscale: [[0, '#134e4a'], [0.5, '#0d9488'], [1, '#5eead4']]
    }], {
        ...layoutDefaults,
        margin: { l: 100, r: 30, t: 30, b: 50 }
    }, { responsive: true });
}

// Map
function renderMap() {
    // Sample data for performance (max 3000 points)
    let mapData = state.data.filter(d => d.latitude && d.longitude);
    if (mapData.length > 3000) {
        mapData = mapData.sort(() => Math.random() - 0.5).slice(0, 3000);
    }

    Plotly.newPlot('chart-map', [{
        lat: mapData.map(d => parseFloat(d.latitude)),
        lon: mapData.map(d => parseFloat(d.longitude)),
        type: 'scattermapbox',
        mode: 'markers',
        marker: {
            size: 5,
            color: '#06b6d4',
            opacity: 0.6
        },
        text: mapData.map(d => `${d.borough || 'Unknown'}<br>Injured: ${d.number_of_persons_injured || 0}`)
    }], {
        ...layoutDefaults,
        mapbox: {
            style: 'carto-darkmatter',
            center: { lat: 40.7128, lon: -74.0060 },
            zoom: 9
        },
        margin: { l: 0, r: 0, t: 0, b: 0 }
    }, { responsive: true });
}
