# cache.py
# A simple in-memory cache shared across the Flask backend.
# Used to store loaded datasets and precomputed values.

class DataCache:
    def __init__(self):
        # Will hold your main merged dataframe (df_merged_final)
        self.df = None

        # Precomputed dropdown lists
        self.filters = {
            "boroughs": [],
            "years": [],
            "vehicle_types": [],
            "contributing_factors": [],
            "injury_types": []
        }

        # Optional: you can store computed results to speed up filtering
        self.results_cache = {}

    def set_dataframe(self, df):
        """Store the main merged dataframe."""
        self.df = df

    def get_dataframe(self):
        """Retrieve the full merged dataframe."""
        return self.df

    def set_filters(self, boroughs, years, vehicle_types, contributing_factors, injury_types):
        """Store dropdown filter options."""
        self.filters["boroughs"] = boroughs
        self.filters["years"] = years
        self.filters["vehicle_types"] = vehicle_types
        self.filters["contributing_factors"] = contributing_factors
        self.filters["injury_types"] = injury_types

    def get_filters(self):
        """Return all dropdown filter options."""
        return self.filters

    def get_cached_result(self, key):
        """Return cached filter result if it exists."""
        return self.results_cache.get(key)

    def set_cached_result(self, key, value):
        """Cache a result to speed up queries."""
        self.results_cache[key] = value


# Create a global cache instance accessible across the Flask backend
cache = DataCache()
