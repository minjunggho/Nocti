def calculate_match_score(driver, company):
    score = 0
    reasons = []

    driver_route = (driver.get("preferred_routes") or "").lower()
    company_route = (company.get("route_type") or "").lower()

    driver_home = (driver.get("home_time_need") or "").lower()
    company_home = (company.get("home_time") or "").lower()

    driver_comm = (driver.get("communication_style") or "").lower()
    company_comm = (company.get("dispatcher_style") or "").lower()

    detention_importance = (driver.get("detention_pay_importance") or "").lower()
    detention_policy = (company.get("detention_pay_policy") or "").lower()

    burnout_risk = company.get("burnout_risk", "Medium")
    retention_score = company.get("retention_score") or 50

    # Route match
    if driver_route and driver_route in company_route:
        score += 25
        reasons.append("Route preference aligns")

    # Home-time match
    if "weekend" in driver_home and "weekend" in company_home:
        score += 30
        reasons.append("Home-time expectation matches")

    if "daily" in driver_home and "daily" in company_home:
        score += 30
        reasons.append("Daily home-time expectation matches")

    # Dispatcher style match
    if "respectful" in driver_comm and (
        "respectful" in company_comm or "direct" in company_comm or "small-team" in company_comm
    ):
        score += 20
        reasons.append("Dispatcher communication style is compatible")

    # Detention pay match
    if "important" in detention_importance:
        if "paid" in detention_policy or "structured" in detention_policy:
            score += 15
            reasons.append("Detention pay policy supports driver income stability")

    # Burnout risk
    if burnout_risk == "Low":
        score += 20
        reasons.append("Lower burnout risk")
    elif burnout_risk == "Medium":
        score += 8
        reasons.append("Moderate burnout risk")
    elif burnout_risk == "High":
        score -= 15
        reasons.append("Higher burnout risk warning")

    # Retention score bonus
    score += int(retention_score * 0.2)

    return {
        "company": company["legal_name"],
        "score": score,
        "reasons": reasons,
        "burnout_risk": burnout_risk,
        "retention_score": retention_score,
        "company_details": company
    }


def match_driver_to_companies(driver, companies):
    results = []

    for company in companies:
        results.append(calculate_match_score(driver, company))

    results.sort(key=lambda x: x["score"], reverse=True)

    return results