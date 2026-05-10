import os
import requests
from dotenv import load_dotenv

load_dotenv()

FMCSA_WEBKEY = os.getenv("FMCSA_WEBKEY")
BASE_URL = "https://mobile.fmcsa.dot.gov/qc/services"


def search_carriers_by_name(company_name: str):
    url = f"{BASE_URL}/carriers/name/{company_name}"
    params = {"webKey": FMCSA_WEBKEY}

    response = requests.get(url, params=params)
    response.raise_for_status()

    data = response.json()

    carriers = data.get("content", [])

    cleaned_carriers = []

    for item in carriers:
        carrier = item.get("carrier", {})

        cleaned_carriers.append({
            "legal_name": carrier.get("legalName"),
            "dba_name": carrier.get("dbaName"),
            "dot_number": carrier.get("dotNumber"),
            "city": carrier.get("phyCity"),
            "state": carrier.get("phyState"),
            "allowed_to_operate": carrier.get("allowedToOperate"),
            "safety_rating": carrier.get("safetyRating"),
            "total_drivers": carrier.get("totalDrivers"),
            "total_power_units": carrier.get("totalPowerUnits"),
            "carrier_operation": carrier.get("carrierOperation"),
            "cargo_carried": carrier.get("cargoCarried"),
        })

    return cleaned_carriers