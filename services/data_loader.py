import pandas as pd
import os

def load_data(nrows=200000):
    """
    Loads the merged dataset into memory once.

    Args:
        nrows: Maximum number of rows to load from CSV. Set to None to load all rows.
    """
    # Get the directory where this file is located (services/)
    current_dir = os.path.dirname(os.path.abspath(__file__))
    # Go up one level to backend/, then into data/
    data_path = os.path.join(current_dir, "..", "data", "df_merged_final.csv")

    df = pd.read_csv(data_path, low_memory=False, nrows=nrows)

    # Basic preprocessing - convert crash_datetime to datetime
    if 'crash_datetime' in df.columns:
        df['crash_datetime'] = pd.to_datetime(df['crash_datetime'], errors='coerce')
        df['year'] = df['crash_datetime'].dt.year
        df['month'] = df['crash_datetime'].dt.month
        df['day'] = df['crash_datetime'].dt.day

    return df


def get_filter_options(df):
    """
    Returns unique values for dropdowns.
    """
    filters = {
        "boroughs": sorted(df["borough"].dropna().unique().tolist()) if "borough" in df.columns else [],
        "years": sorted(df["year"].dropna().unique().tolist()) if "year" in df.columns else [],
        "vehicle_types": sorted(df["vehicle_type_code_1"].dropna().unique().tolist()) if "vehicle_type_code_1" in df.columns else [],
        "contributing_factors": sorted(df["contributing_factor_vehicle_1"].dropna().unique().tolist()) if "contributing_factor_vehicle_1" in df.columns else [],
        "injury_types": []
    }
    
    # Build injury types based on injury/killed columns
    if "number_of_persons_injured" in df.columns and "number_of_persons_killed" in df.columns:
        injury_types = ["Injured", "Killed", "None"]
        filters["injury_types"] = injury_types
    
    return filters
