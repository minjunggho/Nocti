import re


def clean_text(value):
    return (value or "").lower()


def extract_state(location):
    if not location:
        return None

    parts = location.split(",")
    if len(parts) >= 2:
        return parts[-1].strip().upper()

    return None


def extract_route_type(text):
    t = clean_text(text)

    if "home daily" in t or "local" in t:
        return "local"

    if "regional" in t or "home weekly" in t or "home weekends" in t or "home every weekend" in t:
        return "regional"

    if "otr" in t or "over the road" in t or "long haul" in t:
        return "otr"

    return "unknown"


def extract_equipment_type(text):
    t = clean_text(text)

    if "reefer" in t or "refrigerated" in t:
        return "reefer"

    if "dry van" in t:
        return "dry van"

    if "flatbed" in t:
        return "flatbed"

    if "tanker" in t:
        return "tanker"

    if "hazmat" in t:
        return "hazmat"

    return "unknown"


def extract_home_time(text):
    t = clean_text(text)

    if "home daily" in t:
        return "home daily"

    if "home every weekend" in t or "home weekends" in t:
        return "home every weekend"

    if "home weekly" in t:
        return "home weekly"

    if "2 weeks out" in t or "two weeks out" in t:
        return "home every 2 weeks"

    if "3 weeks out" in t or "three weeks out" in t:
        return "home every 3 weeks"

    return "unknown"


def extract_pay_model(text):
    t = clean_text(text)

    if "per mile" in t or "cpm" in t:
        return "cpm"

    if "per hour" in t or "hourly" in t:
        return "hourly"

    if "per week" in t or "weekly" in t:
        return "weekly"

    if "salary" in t:
        return "salary"

    return "unknown"


def extract_weekly_pay(salary_text, description):
    combined = f"{salary_text or ''} {description or ''}".lower()

    # Match "$1,400 - $1,700 per week"
    weekly_range = re.search(
        r"\$?([\d,]+)\s*(?:-|to)\s*\$?([\d,]+)\s*(?:per\s*)?week",
        combined
    )

    if weekly_range:
        low = float(weekly_range.group(1).replace(",", ""))
        high = float(weekly_range.group(2).replace(",", ""))
        return (low + high) / 2

    # Match "$1500 per week"
    weekly_single = re.search(
        r"\$?([\d,]+)\s*(?:per\s*)?week",
        combined
    )

    if weekly_single:
        return float(weekly_single.group(1).replace(",", ""))

    # Match "$70,000 per year"
    yearly = re.search(
        r"\$?([\d,]+)\s*(?:per\s*)?(?:year|yr|annually)",
        combined
    )

    if yearly:
        annual = float(yearly.group(1).replace(",", ""))
        return annual / 52

    return None


def extract_detention_pay(text):
    t = clean_text(text)

    if "detention pay" in t or "paid detention" in t or "paid waiting" in t:
        return "yes"

    return "unknown"


def extract_experience_required(text):
    t = clean_text(text)

    match = re.search(r"(\d+)\+?\s*(?:year|years|yr|yrs)", t)

    if match:
        return int(match.group(1))

    return None


def extract_benefits(text):
    t = clean_text(text)
    benefits = []

    keywords = [
        "health insurance",
        "medical",
        "dental",
        "vision",
        "401k",
        "paid time off",
        "pto",
        "sign-on bonus",
        "safety bonus",
        "paid detention",
        "no-touch",
        "drop and hook",
        "drop-and-hook",
    ]

    for keyword in keywords:
        if keyword in t:
            benefits.append(keyword)

    return ", ".join(benefits) if benefits else None


def extract_job_features(raw_job):
    title = raw_job.get("position") or raw_job.get("title") or raw_job.get("jobTitle")
    company = raw_job.get("company") or raw_job.get("companyName")
    location = raw_job.get("location")
    salary_text = raw_job.get("salary") or raw_job.get("salaryText")
    description = raw_job.get("description") or raw_job.get("jobDescription") or ""

    full_text = f"{title or ''} {salary_text or ''} {description or ''}"

    return {
        "company_name": company,
        "job_title": title,
        "location": location,
        "state": extract_state(location),
        "source": "Indeed / Apify",
        "source_url": raw_job.get("url") or raw_job.get("jobUrl"),
        "salary_text": salary_text,
        "job_description": description,
        "employment_type": raw_job.get("employmentType"),
        "rating": str(raw_job.get("rating")) if raw_job.get("rating") is not None else None,

        "route_type": extract_route_type(full_text),
        "equipment_type": extract_equipment_type(full_text),
        "home_time": extract_home_time(full_text),
        "pay_model": extract_pay_model(full_text),
        "estimated_weekly_pay": extract_weekly_pay(salary_text, description),
        "detention_pay_mentioned": extract_detention_pay(full_text),
        "experience_required": extract_experience_required(full_text),
        "benefits_mentioned": extract_benefits(full_text),
    }