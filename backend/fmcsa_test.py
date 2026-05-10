import os
import json
import requests
from dotenv import load_dotenv

load_dotenv()

WEBKEY = os.getenv("FMCSA_WEBKEY")
company_name = "swift"

url = f"https://mobile.fmcsa.dot.gov/qc/services/carriers/name/{company_name}"
params = {"webKey": WEBKEY}

response = requests.get(url, params=params)

print("Status:", response.status_code)
print(json.dumps(response.json(), indent=2))