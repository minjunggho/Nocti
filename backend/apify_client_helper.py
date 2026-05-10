import os
from dotenv import load_dotenv
from apify_client import ApifyClient

load_dotenv()

APIFY_TOKEN = os.getenv("APIFY_TOKEN")


def scrape_indeed_jobs(position: str, location: str, max_items: int = 10):
    if not APIFY_TOKEN:
        raise ValueError("Missing APIFY_TOKEN in .env")

    client = ApifyClient(APIFY_TOKEN)

    run_input = {
        "position": position,
        "maxItemsPerSearch": max_items,
        "country": "US",
        "location": location,
    }

    run = client.actor("misceres/indeed-scraper").call(run_input=run_input)

    jobs = []

    for item in client.dataset(run["defaultDatasetId"]).iterate_items():
        jobs.append(item)

    return jobs