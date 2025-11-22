def json_response(status, data):
    return {
        "status": status,
        "data": data
    }
def error_response(message):
    return {
        "status": "error",
        "message": message
    }