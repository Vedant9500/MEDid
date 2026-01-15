import requests
try:
    print("Checking http://localhost:8001/metrics ...")
    r = requests.get('http://localhost:8001/metrics', timeout=2)
    print(f"Service status: {r.status_code}")
except Exception as e:
    print(f"Service unreachable: {e}")
