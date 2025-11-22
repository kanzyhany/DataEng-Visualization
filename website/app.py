from flask import Flask, jsonify, request, render_template
from flask_cors import CORS
import pandas as pd
from utils.cache import cache
from services.data_loader import load_data, get_filter_options
from services.filter_engine import apply_filters
from services.search_parser import parse_search_query


# -------------------------------------------------------------
# App Initialization
# -------------------------------------------------------------
app = Flask(__name__)
CORS(app)   # Allow requests from your React frontend


# -------------------------------------------------------------
# Load Dataset on Startup
# -------------------------------------------------------------
def initialize_data():
    """Load merged dataset and precompute filter options."""
    print("Loading df_merged_final.csv ...")

    # Load data using the service module
    df = load_data()

    # Store df in cache
    cache.set_dataframe(df)

    # Get filter options using the service module
    filter_options = get_filter_options(df)

    # Save to cache
    cache.set_filters(
        filter_options.get("boroughs", []),
        filter_options.get("years", []),
        filter_options.get("vehicle_types", []),
        filter_options.get("contributing_factors", []),
        filter_options.get("injury_types", [])
    )

    print("Dataset loaded. Backend ready.")


# Initialize on startup
initialize_data()


# -------------------------------------------------------------
# Routes
# -------------------------------------------------------------

@app.get("/")
def home():
    """Serve the dashboard frontend."""
    return render_template('dashboard.html')


@app.get("/api/filters")
def get_filters():
    """Return dropdown filter options."""
    filters = cache.get_filters()
    return jsonify(filters)


@app.post("/api/data")
def get_data():
    """Return filtered dataset based on user selections."""
    df = cache.get_dataframe()

    if df is None:
        return jsonify({"error": "Dataset not loaded"}), 500

    filters = request.json if request.is_json else {}
    
    # If search query is provided, parse it and merge with existing filters
    search_query = filters.get("search", "").strip()
    if search_query:
        parsed_filters = parse_search_query(search_query)
        # Merge parsed filters with dropdown filters
        # Dropdown filters take precedence if both are set
        for key in ["borough", "year", "vehicle_type", "contributing_factor", "injury_type"]:
            if filters.get(key):
                # Dropdown filter takes precedence (already an array)
                continue
            elif parsed_filters.get(key):
                # Convert parsed filter value to array format (filter_engine expects arrays)
                parsed_value = parsed_filters[key]
                if isinstance(parsed_value, list):
                    filters[key] = parsed_value
                else:
                    filters[key] = [parsed_value]
        
        # Always keep the search text for text search in filter_engine
        filters["search"] = search_query
    else:
        # Remove search key if empty
        filters.pop("search", None)

    # Apply filters using the service module
    filtered_df = apply_filters(df, filters)

    # Return filtered data to frontend
    result = filtered_df.to_dict(orient="records")

    return jsonify({
        "count": len(result),
        "data": result
    })


# -------------------------------------------------------------
# Run Application
# -------------------------------------------------------------
if __name__ == "__main__":
    app.run(debug=True, port=5000)
