import pandas as pd

def apply_filters(df, filters):
    """
    Applies dropdown filters sent from frontend.
    Now supports multiple selections for each filter.
    """
    df_filtered = df.copy()

    # Apply borough filter - multiple selection
    borough_filters = filters.get("borough")
    if borough_filters and len(borough_filters) > 0:
        if "borough" in df_filtered.columns:
            df_filtered = df_filtered[df_filtered["borough"].isin(borough_filters)]

    # Apply year filter - multiple selection
    year_filters = filters.get("year")
    if year_filters and len(year_filters) > 0:
        if "year" in df_filtered.columns:
            # Convert years to integers for comparison
            years = [int(y) for y in year_filters]
            df_filtered = df_filtered[df_filtered["year"].isin(years)]

    # Apply vehicle type filter - multiple selection
    vehicle_filters = filters.get("vehicle_type")
    if vehicle_filters and len(vehicle_filters) > 0:
        # Build a primary vehicle column for robust matching: prefer vehicle_type_code_1, else vehicle_type_code_2
        # If neither column exists, skip filtering (no vehicle data available)
        if "vehicle_type_code_1" in df_filtered.columns or "vehicle_type_code_2" in df_filtered.columns:
            v1 = df_filtered["vehicle_type_code_1"] if "vehicle_type_code_1" in df_filtered.columns else pd.Series([None]*len(df_filtered), index=df_filtered.index)
            v2 = df_filtered["vehicle_type_code_2"] if "vehicle_type_code_2" in df_filtered.columns else pd.Series([None]*len(df_filtered), index=df_filtered.index)

            # coalesce v1 then v2, convert NaN to empty string
            primary = v1.fillna("").astype(str)
            # where primary is empty, use v2
            primary = primary.where(primary != "", v2.fillna("").astype(str))

            # Now filter where primary is in vehicle_filters
            mask = primary.isin(vehicle_filters)
            df_filtered = df_filtered[mask]

    # Apply contributing factor filter - multiple selection
    factor_filters = filters.get("contributing_factor")
    if factor_filters and len(factor_filters) > 0:
        if "contributing_factor_vehicle_1" in df_filtered.columns or "contributing_factor_vehicle_2" in df_filtered.columns:
            mask = pd.Series([False] * len(df_filtered), index=df_filtered.index)
            
            if "contributing_factor_vehicle_1" in df_filtered.columns:
                mask1 = df_filtered["contributing_factor_vehicle_1"].isin(factor_filters)
                mask = mask | mask1
            
            if "contributing_factor_vehicle_2" in df_filtered.columns:
                mask2 = df_filtered["contributing_factor_vehicle_2"].isin(factor_filters)
                mask = mask | mask2
            
            df_filtered = df_filtered[mask]

    # Apply injury type filter - multiple selection
    injury_filters = filters.get("injury_type")
    if injury_filters and len(injury_filters) > 0:
        # For injury type, we'll use OR logic between multiple selections
        injury_mask = pd.Series([False] * len(df_filtered), index=df_filtered.index)
        
        for injury_type in injury_filters:
            if injury_type == "Injured":
                if "number_of_persons_injured" in df_filtered.columns:
                    injury_mask = injury_mask | (df_filtered["number_of_persons_injured"] > 0)
            elif injury_type == "Killed":
                if "number_of_persons_killed" in df_filtered.columns:
                    injury_mask = injury_mask | (df_filtered["number_of_persons_killed"] > 0)
            elif injury_type == "None":
                if "number_of_persons_injured" in df_filtered.columns and "number_of_persons_killed" in df_filtered.columns:
                    injury_mask = injury_mask | (
                        (df_filtered["number_of_persons_injured"] == 0) &
                        (df_filtered["number_of_persons_killed"] == 0)
                    )
        
        df_filtered = df_filtered[injury_mask]

    # Search mode: text search in multiple columns
    # Only apply text search if no structured filters were found (pure text search)
    # OR if there are unparsed words that should be searched in street names
    has_structured_filters = any([
        filters.get("borough"),
        filters.get("year"),
        filters.get("vehicle_type"),
        filters.get("contributing_factor"),
        filters.get("injury_type")
    ])
    
    search = filters.get("search", "").strip()
    # if search:
    #     # If structured filters were found, skip text search entirely
    #     # The structured filters already handle the parsed parts correctly
    #     # This ensures search results match dropdown filter results
    #     if not has_structured_filters:
    #         # Pure text search - no structured filters found
    #         search_lower = search.lower()
    #         search_cols = [
    #             "borough", "vehicle_type_code_1", "vehicle_type_code_2",
    #             "contributing_factor_vehicle_1", "contributing_factor_vehicle_2",
    #             "on_street_name", "cross_street_name", "off_street_name"
    #         ]
            
    #         # Split search query into words and match if ANY word matches
    #         search_words = search_lower.split()
    #         search_mask = pd.Series([False] * len(df_filtered), index=df_filtered.index)
            
    #         for col in search_cols:
    #             if col in df_filtered.columns:
    #                 col_str = df_filtered[col].astype(str).str.lower().fillna('')
    #                 # Match if any word in the search query is found in this column
    #                 for word in search_words:
    #                     if word.strip():  # Skip empty words
    #                         search_mask = search_mask | col_str.str.contains(word.strip(), na=False, regex=False)
            
    #         if search_mask.any():
    #             df_filtered = df_filtered[search_mask]

    if search:
        search_lower = search.lower()
        search_cols = [
            "borough", "vehicle_type_code_1", "vehicle_type_code_2",
            "contributing_factor_vehicle_1", "contributing_factor_vehicle_2",
            "on_street_name", "cross_street_name", "off_street_name"
        ]

        search_words = search_lower.split()
        search_mask = pd.Series([False] * len(df_filtered), index=df_filtered.index)

        for col in search_cols:
            if col in df_filtered.columns:
                col_str = df_filtered[col].astype(str).str.lower().fillna('')
                for word in search_words:
                    if word.strip():
                        search_mask |= col_str.str.contains(word.strip(), na=False, regex=False)

        df_filtered = df_filtered[search_mask]


    return df_filtered