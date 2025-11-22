import re

def parse_search_query(text):
    """
    Converts text like:
    'Brooklyn 2021 pedestrian crashes'
    into filters for the API.
    """
    if not text or not isinstance(text, str):
        return {}

    text = text.lower().strip()
    filters = {}

    # Boroughs detection - more comprehensive
    # Note: Values must match the exact case in the dataset: "Bronx", "Brooklyn", etc.
    borough_patterns = {
        "Brooklyn": ["brooklyn", "bk", "bklyn", "kings"],
        "Queens": ["queens", "qn", "qns"],
        "Manhattan": ["manhattan", "mhtn", "nyc", "new york city", "man"],
        "Bronx": ["bronx", "bx"],
        "Staten Island": ["staten island", "staten", "si", "staten is", "richmond"]
    }
    
    for borough, patterns in borough_patterns.items():
        for pattern in patterns:
            if pattern in text:
                filters["borough"] = borough
                break
        if "borough" in filters:
            break

    # Year detection (4-digit years starting with 20)
    year_match = re.search(r"(20\d{2})", text)
    if year_match:
        filters["year"] = int(year_match.group(1))

    # Injury type detection
    if any(word in text for word in ["injured", "injury", "injuries", "hurt"]):
        filters["injury_type"] = "Injured"
    elif any(word in text for word in ["killed", "fatal", "fatality", "death", "dead"]):
        filters["injury_type"] = "Killed"
    elif "no injury" in text or "uninjured" in text:
        filters["injury_type"] = "None"

    # Vehicle types
    vehicle_map = [
        ("station wagon", "Station Wagon/Sport Utility Vehicle"),
        ("sport utility", "Station Wagon/Sport Utility Vehicle"),
        ("suv", "Station Wagon/Sport Utility Vehicle"),
        ("pickup truck", "Pick-up Truck"),
        ("pickup", "Pick-up Truck"),
        ("sedan", "Sedan"),
        ("car", "Sedan"),
        ("van", "Van"),
        ("taxi", "Taxi"),
        ("motorcycle", "Motorcycle"),
        ("bike", "Motorcycle"),
        ("bus", "Bus"),
        ("truck", "Truck"),
        ("bicycle", "Bicycle"),
        ("pedestrian", "Pedestrian"),
    ]
    
    for keyword, vehicle_type in vehicle_map:
        if keyword in text:
            filters["vehicle_type"] = vehicle_type
            break

    # Contributing factors
    factor_keywords = {
        "Unsafe Speed": ["unsafe speed", "speeding", "speed", "too fast"],
        "Failure To Yield Right-Of-Way": ["failure to yield", "yield", "right of way"],
        "Driver Inattention/Distraction": ["driver inattention", "inattention", "distraction", "distracted", "phone"],
        "Following Too Closely": ["following too closely", "tailgating", "tailgate"],
        "Backing Unsafely": ["backing unsafely", "backing", "reverse"],
    }
    
    for factor, keywords in factor_keywords.items():
        for keyword in keywords:
            if keyword in text:
                filters["contributing_factor"] = factor
                break
        if "contributing_factor" in filters:
            break

    return filters