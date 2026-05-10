def text(value):
    return (value or "").lower()


def score_home_time(driver, job):
    desired = text(driver.desired_home_time)
    offered = text(job.home_time + " " + (job.job_description or ""))

    if "daily" in desired and "daily" in offered:
        return 25, "Home-time fit is strong because the job appears to offer daily home time."

    if "weekend" in desired and "weekend" in offered:
        return 25, "Home-time fit is strong because the job appears to support weekends home."

    if "home" in desired and "home" in offered:
        return 15, "The job mentions home time, but the exact cadence may need confirmation."

    if "otr" in offered or "2-3 weeks" in offered:
        return -10, "Potential home-time mismatch because the job may require longer time away."

    return 0, "Home-time details are unclear."


def score_pay(driver, job, benchmark_weekly=None):
    if not job.estimated_weekly_pay:
        return 0, "Pay is not clearly listed."

    if benchmark_weekly:
        if job.estimated_weekly_pay >= benchmark_weekly * 1.15:
            return 20, "Pay appears above the local wage benchmark."
        if job.estimated_weekly_pay >= benchmark_weekly:
            return 15, "Pay appears near or above the local wage benchmark."
        if job.estimated_weekly_pay >= benchmark_weekly * 0.85:
            return 8, "Pay is slightly below the local wage benchmark."
        return -10, "Pay appears meaningfully below the local wage benchmark."

    return 10, "Pay is listed, but no local benchmark was available."


def score_route(driver, job):
    preferred = text(driver.preferred_lane_type)
    route = text(job.route_type + " " + (job.job_description or ""))

    if preferred and preferred in route:
        return 15, "Route preference matches the job."

    if "local" in preferred and "regional" in route:
        return 5, "The job is regional, which may partially fit a local preference."

    if "regional" in preferred and "local" in route:
        return 8, "The job is local, which may support better home time."

    return 0, "Route fit is unclear."


def score_equipment(driver, job):
    driver_equipment = text(driver.vehicle_type)
    job_equipment = text(job.equipment_type + " " + (job.job_description or ""))

    if not driver_equipment or not job_equipment:
        return 0, "Equipment fit is unclear."

    equipment_keywords = ["dry van", "reefer", "flatbed", "tanker", "hazmat", "auto transport"]

    for keyword in equipment_keywords:
        if keyword in driver_equipment and keyword in job_equipment:
            return 10, f"Equipment fit is strong because both mention {keyword}."

    return 0, "Equipment experience does not clearly match the job."


def score_experience(driver, job):
    if job.experience_required is None:
        return 5, "Experience requirement is not clearly stated."

    if driver.experience_years is None:
        return 0, "Driver experience is unknown."

    if driver.experience_years >= job.experience_required:
        return 10, "Driver meets the listed experience requirement."

    return -10, "Driver may not meet the listed experience requirement."


def score_fairness(driver, job):
    description = text(job.job_description)
    detention = text(job.detention_pay_mentioned)

    score = 0
    reasons = []

    if "yes" in detention or "detention" in description or "paid waiting" in description:
        score += 10
        reasons.append("The job mentions detention pay or paid waiting time.")

    if "no-touch" in description or "drop and hook" in description or "drop-and-hook" in description:
        score += 5
        reasons.append("The job mentions lower-friction freight like no-touch or drop-and-hook.")

    if not reasons:
        return 0, "No clear fairness signals like detention pay were found."

    return score, " ".join(reasons)


def score_burnout(driver, job):
    description = text(job.job_description + " " + (job.home_time or "") + " " + (job.route_type or ""))

    score = 0
    reasons = []

    if "predictable" in description:
        score += 8
        reasons.append("Predictable scheduling may reduce burnout.")

    if "home daily" in description or "home every weekend" in description:
        score += 8
        reasons.append("Reliable home time may support work-life balance.")

    if "otr" in description or "weeks out" in description:
        score -= 10
        reasons.append("Long time away may increase burnout risk.")

    if "forced dispatch" in description:
        score -= 10
        reasons.append("Forced dispatch may increase stress and burnout.")

    if not reasons:
        return 0, "Burnout risk is unclear from the job posting."

    return score, " ".join(reasons)


def calculate_job_match(driver, job, benchmark_weekly=None):
    score = 0
    reasons = []

    scorers = [
        score_home_time,
        lambda d, j: score_pay(d, j, benchmark_weekly),
        score_route,
        score_equipment,
        score_experience,
        score_fairness,
        score_burnout,
    ]

    for scorer in scorers:
        points, reason = scorer(driver, job)
        score += points
        reasons.append({
            "points": points,
            "reason": reason
        })

    score = max(0, min(100, score))

    return {
        "job_id": job.id,
        "company_name": job.company_name,
        "job_title": job.job_title,
        "location": job.location,
        "compatibility_score": score,
        "estimated_weekly_pay": job.estimated_weekly_pay,
        "home_time": job.home_time,
        "route_type": job.route_type,
        "equipment_type": job.equipment_type,
        "source_url": job.source_url,
        "reasons": reasons
    }