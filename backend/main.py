from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
from dotenv import load_dotenv

import os
import re
import random
import smtplib
from datetime import datetime, timedelta
from email.message import EmailMessage
from urllib.parse import quote

from apify_client_helper import scrape_indeed_jobs
from job_feature_extractor import extract_job_features
from job_matching_engine import calculate_job_match

from database import engine, SessionLocal
from models import Base, Driver, Job, WageBenchmark


# -------------------------
# App Setup
# -------------------------

load_dotenv()

app = FastAPI(title="NOCTEAM Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # For hackathon/dev. Replace with Lovable URL later.
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

Base.metadata.create_all(bind=engine)


# -------------------------
# Email Settings
# -------------------------

EMAIL_HOST = os.getenv("EMAIL_HOST")
EMAIL_PORT = int(os.getenv("EMAIL_PORT", "587"))
EMAIL_USER = os.getenv("EMAIL_USER")
EMAIL_PASSWORD = os.getenv("EMAIL_PASSWORD")
EMAIL_FROM = os.getenv("EMAIL_FROM", EMAIL_USER)

FRONTEND_ONBOARDING_URL = os.getenv(
    "FRONTEND_ONBOARDING_URL",
    "https://id-preview--5472f5c3-cc92-413b-898b-a75d56e8db92.lovable.app/on-boarding"
)


# -------------------------
# Request Models
# -------------------------

class JobCreate(BaseModel):
    company_name: Optional[str] = None
    job_title: Optional[str] = None
    location: Optional[str] = None
    state: Optional[str] = None
    source_url: Optional[str] = None
    salary_text: Optional[str] = None
    job_description: Optional[str] = None
    employment_type: Optional[str] = None
    rating: Optional[str] = None
    route_type: Optional[str] = None
    equipment_type: Optional[str] = None
    home_time: Optional[str] = None
    pay_model: Optional[str] = None
    estimated_weekly_pay: Optional[float] = None
    detention_pay_mentioned: Optional[str] = None
    experience_required: Optional[int] = None
    benefits_mentioned: Optional[str] = None


class JobUpdate(BaseModel):
    company_name: Optional[str] = None
    job_title: Optional[str] = None
    location: Optional[str] = None
    state: Optional[str] = None
    source_url: Optional[str] = None
    salary_text: Optional[str] = None
    job_description: Optional[str] = None
    employment_type: Optional[str] = None
    rating: Optional[str] = None
    route_type: Optional[str] = None
    equipment_type: Optional[str] = None
    home_time: Optional[str] = None
    pay_model: Optional[str] = None
    estimated_weekly_pay: Optional[float] = None
    detention_pay_mentioned: Optional[str] = None
    experience_required: Optional[int] = None
    benefits_mentioned: Optional[str] = None


class DriverUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    email_confirmed: Optional[bool] = None
    database_consent: Optional[bool] = None
    experience_years: Optional[int] = None
    vehicle_type: Optional[str] = None
    home_city: Optional[str] = None
    home_state: Optional[str] = None
    preferred_lane_type: Optional[str] = None
    desired_home_time: Optional[str] = None
    pay_priority: Optional[str] = None
    communication_preference: Optional[str] = None
    burnout_concerns: Optional[str] = None


class WageBenchmarkCreate(BaseModel):
    state: str
    annual_median_wage: Optional[float] = None
    weekly_median_wage: Optional[float] = None
    year: Optional[int] = None


class WageBenchmarkUpdate(BaseModel):
    state: Optional[str] = None
    annual_median_wage: Optional[float] = None
    weekly_median_wage: Optional[float] = None
    year: Optional[int] = None


class JobScrapeRequest(BaseModel):
    position: str = "truck driver"
    location: str = "California"
    max_items: int = 10


class EmailRequest(BaseModel):
    email: str


class VerifyEmailRequest(BaseModel):
    email: str
    code: str


# -------------------------
# Helpers
# -------------------------

def clean_value(value):
    """
    Converts bad string values from Vapi like 'null', 'none', or '' into real None.
    """
    if value is None:
        return None

    if isinstance(value, str):
        cleaned = value.strip()
        if cleaned.lower() in ["", "null", "none", "unknown", "n/a"]:
            return None
        return cleaned

    return value


def safe_int(value):
    try:
        value = clean_value(value)

        if value is None:
            return None

        if isinstance(value, (int, float)):
            return int(value)

        text = str(value).lower().strip()

        word_numbers = {
            "zero": 0,
            "one": 1,
            "two": 2,
            "three": 3,
            "four": 4,
            "five": 5,
            "six": 6,
            "seven": 7,
            "eight": 8,
            "nine": 9,
            "ten": 10,
            "eleven": 11,
            "twelve": 12,
            "thirteen": 13,
            "fourteen": 14,
            "fifteen": 15,
            "sixteen": 16,
            "seventeen": 17,
            "eighteen": 18,
            "nineteen": 19,
            "twenty": 20,
        }

        for word, number in word_numbers.items():
            if word in text:
                return number

        match = re.search(r"\d+(\.\d+)?", text)
        if match:
            return int(float(match.group()))

        return None

    except (ValueError, TypeError):
        return None


def normalize_email(email):
    email = clean_value(email)

    if not email:
        return None

    email = str(email).strip().lower()

    if "@" not in email or "." not in email:
        return None

    return email


def model_has_column(model, column_name: str) -> bool:
    return column_name in model.__table__.columns.keys()


def filter_model_data(model, data: dict) -> dict:
    valid_columns = set(model.__table__.columns.keys())
    return {key: value for key, value in data.items() if key in valid_columns}


def generate_verification_code():
    return str(random.randint(100000, 999999))


def send_verification_email(to_email: str, driver_name: Optional[str], code: str):
    if not EMAIL_HOST or not EMAIL_USER or not EMAIL_PASSWORD:
        raise HTTPException(
            status_code=500,
            detail="Email settings are missing. Check EMAIL_HOST, EMAIL_USER, and EMAIL_PASSWORD in .env."
        )

    encoded_email = quote(to_email)
    onboarding_link = f"{FRONTEND_ONBOARDING_URL}?email={encoded_email}"

    name_text = driver_name or "there"

    subject = "Confirm your NOCTI driver profile"

    body = f"""
Hi {name_text},

Thanks for speaking with NOCTI earlier.

Use this verification code to confirm your driver profile:

{code}

Continue your profile here:
{onboarding_link}

This code will expire in 30 minutes.

- NOCTI Team
"""

    msg = EmailMessage()
    msg["Subject"] = subject
    msg["From"] = EMAIL_FROM
    msg["To"] = to_email
    msg.set_content(body)

    with smtplib.SMTP(EMAIL_HOST, EMAIL_PORT) as server:
        server.starttls()
        server.login(EMAIL_USER, EMAIL_PASSWORD)
        server.send_message(msg)

    return True


def create_and_send_driver_verification_email(db, driver: Driver):
    """
    Generates a fresh 6-digit code, saves it to the driver, and sends the email.
    """
    if not hasattr(driver, "email_verification_code") or not hasattr(driver, "email_verification_expires_at"):
        raise HTTPException(
            status_code=500,
            detail="Driver model is missing email_verification_code or email_verification_expires_at columns."
        )

    if not driver.email:
        raise HTTPException(status_code=400, detail="Driver does not have an email address.")

    code = generate_verification_code()
    expires_at = datetime.utcnow() + timedelta(minutes=30)

    driver.email_verification_code = code
    driver.email_verification_expires_at = expires_at

    # Important: email_confirmed should mean verified by code, not just repeated during Vapi call.
    if hasattr(driver, "email_confirmed"):
        driver.email_confirmed = False

    db.commit()
    db.refresh(driver)

    send_verification_email(
        to_email=driver.email,
        driver_name=driver.name,
        code=code,
    )

    return True


def driver_to_dict(driver: Driver):
    data = {
        "id": driver.id,
        "name": driver.name,
        "experience_years": driver.experience_years,
        "vehicle_type": driver.vehicle_type,
        "home_city": driver.home_city,
        "home_state": driver.home_state,
        "preferred_lane_type": driver.preferred_lane_type,
        "desired_home_time": driver.desired_home_time,
        "pay_priority": driver.pay_priority,
        "communication_preference": driver.communication_preference,
        "burnout_concerns": driver.burnout_concerns,
        "created_at": driver.created_at,
    }

    if hasattr(driver, "email"):
        data["email"] = driver.email

    if hasattr(driver, "email_confirmed"):
        data["email_confirmed"] = driver.email_confirmed

    if hasattr(driver, "database_consent"):
        data["database_consent"] = driver.database_consent

    return data


def job_to_dict(job: Job):
    return {
        "id": job.id,
        "company_name": job.company_name,
        "job_title": job.job_title,
        "location": job.location,
        "state": job.state,
        "source": job.source,
        "source_url": job.source_url,
        "salary_text": job.salary_text,
        "job_description": job.job_description,
        "employment_type": job.employment_type,
        "rating": job.rating,
        "route_type": job.route_type,
        "equipment_type": job.equipment_type,
        "home_time": job.home_time,
        "pay_model": job.pay_model,
        "estimated_weekly_pay": job.estimated_weekly_pay,
        "detention_pay_mentioned": job.detention_pay_mentioned,
        "experience_required": job.experience_required,
        "benefits_mentioned": job.benefits_mentioned,
        "created_at": job.created_at,
    }


def benchmark_to_dict(benchmark: WageBenchmark):
    return {
        "id": benchmark.id,
        "state": benchmark.state,
        "occupation": benchmark.occupation,
        "annual_median_wage": benchmark.annual_median_wage,
        "weekly_median_wage": benchmark.weekly_median_wage,
        "source": benchmark.source,
        "year": benchmark.year,
    }


def get_benchmark_for_state(db, state):
    state = clean_value(state)

    if not state:
        return None

    benchmark = db.query(WageBenchmark).filter(
        WageBenchmark.state == state.upper()
    ).first()

    if benchmark:
        return benchmark.weekly_median_wage

    return None


def extract_vapi_structured_data(payload: dict) -> dict:
    """
    Supports multiple possible Vapi payload shapes.

    1. Direct:
       { ... }

    2. Old manual format:
       { "result": { ... } }

    3. Vapi webhook:
       { "message": { "analysis": { "structuredData": { ... } } } }

    4. Call object:
       { "call": { "analysis": { "structuredData": { ... } } } }

    5. Tool call wrapper:
       {
         "some-id": {
           "name": "driver_intake",
           "result": { ... }
         }
       }
    """
    if not payload:
        return {}

    message = payload.get("message")
    if isinstance(message, dict):
        analysis = message.get("analysis")
        if isinstance(analysis, dict):
            structured = analysis.get("structuredData")
            if isinstance(structured, dict):
                return structured

    call = payload.get("call")
    if isinstance(call, dict):
        analysis = call.get("analysis")
        if isinstance(analysis, dict):
            structured = analysis.get("structuredData")
            if isinstance(structured, dict):
                return structured

    result = payload.get("result")
    if isinstance(result, dict):
        return result

    # Handles Vapi/Lovable style wrapper with random UUID key.
    if len(payload.keys()) == 1:
        only_value = list(payload.values())[0]
        if isinstance(only_value, dict):
            nested_result = only_value.get("result")
            if isinstance(nested_result, dict):
                return nested_result

    return payload


# -------------------------
# Health Check
# -------------------------

@app.get("/")
def home():
    return {"message": "NOCTEAM backend is running"}


# -------------------------
# Vapi Driver Intake
# -------------------------

@app.post("/vapi/match-driver")
def vapi_match_driver(payload: dict):
    result = extract_vapi_structured_data(payload)

    experience = result.get("experience", {}) or {}
    current_job = result.get("current_job", {}) or {}
    preferences = result.get("preferences", {}) or {}
    identity = result.get("driver_identity", {}) or {}
    consent = result.get("consent", {}) or {}

    email = normalize_email(identity.get("email") or result.get("email"))

    # This means Vapi repeated the email and the driver confirmed it verbally.
    # It does NOT mean the email code has been verified.
    vapi_email_confirmed = bool(
        identity.get("email_confirmed", result.get("email_confirmed", False))
    )

    database_consent = bool(
        identity.get("database_consent")
        or result.get("database_consent")
        or consent.get("added_to_database")
        or False
    )

    next_action = result.get("next_action")

    if not database_consent:
        return {
            "status": "skipped_no_database_consent",
            "message": "Driver was not saved because database_consent is false.",
            "received_data": result,
        }

    if not email:
        return {
            "status": "skipped_missing_email",
            "message": "Driver agreed, but no valid email was provided.",
            "received_data": result,
        }

    if not vapi_email_confirmed:
        return {
            "status": "skipped_email_not_confirmed_by_vapi",
            "message": "Driver gave an email, but Vapi did not confirm it clearly during the call.",
            "received_email": email,
            "received_data": result,
        }

    if next_action and next_action not in ["send_registration_email", "needs_manual_review"]:
        return {
            "status": "skipped_next_action_not_ready",
            "message": f"next_action was '{next_action}', not ready for onboarding email.",
            "received_email": email,
            "received_data": result,
        }

    driver_data = {
        "name": clean_value(identity.get("first_name") or identity.get("name") or result.get("name")),

        "email": email,

        # Important:
        # DB email_confirmed means the driver entered the code successfully.
        # So it starts false, even if Vapi verbally confirmed the email.
        "email_confirmed": False,

        "database_consent": database_consent,

        "experience_years": safe_int(
            experience.get("years_driving")
            or experience.get("experience_years")
            or experience.get("years_experience")
            or result.get("experience_years")
            or result.get("years_driving")
            or result.get("years_experience")
        ),

        "vehicle_type": clean_value(
            experience.get("equipment_experience")
            or experience.get("vehicle_type")
            or result.get("equipment_experience")
            or result.get("vehicle_type")
        ),

        "home_city": clean_value(identity.get("home_city") or result.get("home_city")),
        "home_state": clean_value(identity.get("home_state") or result.get("home_state")),

        "preferred_lane_type": clean_value(
            preferences.get("preferred_lane_type")
            or preferences.get("lane_type")
            or result.get("preferred_lane_type")
        ),

        "desired_home_time": clean_value(
            current_job.get("hometime_cadence")
            or preferences.get("desired_home_time")
            or result.get("desired_home_time")
        ),

        "pay_priority": clean_value(
            preferences.get("values_pay_or_balance")
            or preferences.get("pay_priority")
            or result.get("pay_priority")
        ),

        "communication_preference": clean_value(
            preferences.get("dream_job_freeform")
            or preferences.get("communication_preference")
            or result.get("communication_preference")
        ),

        "burnout_concerns": clean_value(
            preferences.get("dislikes_about_current")
            or preferences.get("burnout_concerns")
            or result.get("burnout_concerns")
        ),
    }

    save_data = filter_model_data(Driver, driver_data)

    db = SessionLocal()

    existing_driver = None

    if model_has_column(Driver, "email"):
        existing_driver = db.query(Driver).filter(
            Driver.email == email
        ).first()

    if not existing_driver:
        existing_driver = db.query(Driver).filter(
            Driver.name == driver_data["name"],
            Driver.vehicle_type == driver_data["vehicle_type"],
            Driver.desired_home_time == driver_data["desired_home_time"],
            Driver.burnout_concerns == driver_data["burnout_concerns"],
        ).first()

    try:
        if existing_driver:
            for key, value in save_data.items():
                setattr(existing_driver, key, value)

            db.commit()
            db.refresh(existing_driver)

            email_sent = False
            email_error = None

            try:
                create_and_send_driver_verification_email(db, existing_driver)
                email_sent = True
            except Exception as e:
                email_error = str(e)

            updated_driver = driver_to_dict(existing_driver)
            db.close()

            return {
                "status": "duplicate_updated",
                "driver": updated_driver,
                "saved_driver_id": updated_driver["id"],
                "verification_email_sent": email_sent,
                "email_error": email_error,
            }

        new_driver = Driver(**save_data)
        db.add(new_driver)
        db.commit()
        db.refresh(new_driver)

        email_sent = False
        email_error = None

        try:
            create_and_send_driver_verification_email(db, new_driver)
            email_sent = True
        except Exception as e:
            email_error = str(e)

        saved_driver = driver_to_dict(new_driver)
        db.close()

        return {
            "status": "saved",
            "driver": saved_driver,
            "saved_driver_id": saved_driver["id"],
            "verification_email_sent": email_sent,
            "email_error": email_error,
        }

    except Exception as e:
        db.close()
        raise HTTPException(status_code=500, detail=str(e))


# -------------------------
# Drivers
# -------------------------

@app.get("/drivers")
def get_drivers():
    db = SessionLocal()
    drivers = db.query(Driver).order_by(Driver.id.desc()).all()
    result = [driver_to_dict(driver) for driver in drivers]
    db.close()

    return {
        "count": len(result),
        "drivers": result,
    }


@app.get("/drivers/by-email")
def get_driver_by_email(email: str):
    clean_email = normalize_email(email)

    if not clean_email:
        raise HTTPException(status_code=400, detail="Valid email is required")

    if not model_has_column(Driver, "email"):
        raise HTTPException(status_code=500, detail="Driver model is missing email column.")

    db = SessionLocal()
    driver = db.query(Driver).filter(Driver.email == clean_email).first()
    db.close()

    if not driver:
        raise HTTPException(status_code=404, detail="Driver not found")

    return {
        "success": True,
        "driver": driver_to_dict(driver),
    }


@app.post("/drivers/send-verification-email")
def send_driver_verification_email(request: EmailRequest):
    clean_email = normalize_email(request.email)

    if not clean_email:
        raise HTTPException(status_code=400, detail="Valid email is required")

    db = SessionLocal()
    driver = db.query(Driver).filter(Driver.email == clean_email).first()

    if not driver:
        db.close()
        raise HTTPException(status_code=404, detail="Driver not found")

    try:
        create_and_send_driver_verification_email(db, driver)
    except Exception as e:
        db.close()
        raise HTTPException(
            status_code=500,
            detail=f"Email failed to send: {str(e)}"
        )

    db.close()

    return {
        "success": True,
        "message": "Verification email sent",
        "email": clean_email,
    }


@app.post("/drivers/verify-email")
def verify_driver_email(request: VerifyEmailRequest):
    clean_email = normalize_email(request.email)

    if not clean_email:
        raise HTTPException(status_code=400, detail="Valid email is required")

    code = str(request.code).strip()

    if not code:
        raise HTTPException(status_code=400, detail="Verification code is required")

    db = SessionLocal()
    driver = db.query(Driver).filter(Driver.email == clean_email).first()

    if not driver:
        db.close()
        raise HTTPException(status_code=404, detail="Driver not found")

    if not hasattr(driver, "email_verification_code") or not hasattr(driver, "email_verification_expires_at"):
        db.close()
        raise HTTPException(
            status_code=500,
            detail="Driver model is missing email verification columns."
        )

    if not driver.email_verification_code:
        db.close()
        raise HTTPException(
            status_code=400,
            detail="No verification code found. Please request a new code."
        )

    if driver.email_verification_expires_at and datetime.utcnow() > driver.email_verification_expires_at:
        db.close()
        raise HTTPException(
            status_code=400,
            detail="Verification code expired. Please request a new code."
        )

    if str(driver.email_verification_code).strip() != code:
        db.close()
        raise HTTPException(status_code=400, detail="Invalid verification code")

    driver.email_confirmed = True
    driver.email_verification_code = None
    driver.email_verification_expires_at = None

    db.commit()
    db.refresh(driver)

    verified_driver = driver_to_dict(driver)
    db.close()

    return {
        "success": True,
        "message": "Email verified",
        "driver": verified_driver,
    }


@app.get("/drivers/{driver_id}")
def get_driver(driver_id: int):
    db = SessionLocal()
    driver = db.query(Driver).filter(Driver.id == driver_id).first()
    db.close()

    if not driver:
        raise HTTPException(status_code=404, detail="Driver not found")

    return driver_to_dict(driver)


@app.put("/drivers/{driver_id}")
def update_driver(driver_id: int, update: DriverUpdate):
    db = SessionLocal()
    driver = db.query(Driver).filter(Driver.id == driver_id).first()

    if not driver:
        db.close()
        raise HTTPException(status_code=404, detail="Driver not found")

    update_data = update.model_dump(exclude_unset=True)

    if "email" in update_data:
        update_data["email"] = normalize_email(update_data["email"])

    for key in update_data:
        update_data[key] = clean_value(update_data[key])

    update_data = filter_model_data(Driver, update_data)

    for key, value in update_data.items():
        setattr(driver, key, value)

    db.commit()
    db.refresh(driver)

    updated_driver = driver_to_dict(driver)
    db.close()

    return {
        "status": "updated",
        "driver": updated_driver,
    }


@app.delete("/drivers/{driver_id}")
def delete_driver(driver_id: int):
    db = SessionLocal()
    driver = db.query(Driver).filter(Driver.id == driver_id).first()

    if not driver:
        db.close()
        raise HTTPException(status_code=404, detail="Driver not found")

    deleted_driver = driver_to_dict(driver)

    db.delete(driver)
    db.commit()
    db.close()

    return {
        "status": "deleted",
        "deleted_driver": deleted_driver,
    }


@app.delete("/drivers")
def delete_all_drivers():
    db = SessionLocal()
    deleted_count = db.query(Driver).count()
    db.query(Driver).delete()
    db.commit()
    db.close()

    return {
        "status": "all_drivers_deleted",
        "deleted_count": deleted_count,
    }


# -------------------------
# Jobs
# -------------------------

@app.post("/jobs")
def create_job(job: JobCreate):
    db = SessionLocal()

    new_job = Job(**job.model_dump())
    db.add(new_job)
    db.commit()
    db.refresh(new_job)

    saved_id = new_job.id
    db.close()

    return {
        "status": "job_saved",
        "job_id": saved_id,
    }


@app.get("/jobs")
def get_jobs():
    db = SessionLocal()
    jobs = db.query(Job).order_by(Job.id.desc()).all()
    result = [job_to_dict(job) for job in jobs]
    db.close()

    return {
        "count": len(result),
        "jobs": result,
    }


@app.get("/jobs/{job_id}")
def get_job(job_id: int):
    db = SessionLocal()
    job = db.query(Job).filter(Job.id == job_id).first()
    db.close()

    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    return job_to_dict(job)


@app.put("/jobs/{job_id}")
def update_job(job_id: int, update: JobUpdate):
    db = SessionLocal()
    job = db.query(Job).filter(Job.id == job_id).first()

    if not job:
        db.close()
        raise HTTPException(status_code=404, detail="Job not found")

    update_data = update.model_dump(exclude_unset=True)

    for key, value in update_data.items():
        setattr(job, key, value)

    db.commit()
    db.refresh(job)

    updated_job = job_to_dict(job)
    db.close()

    return {
        "status": "updated",
        "job": updated_job,
    }


@app.delete("/jobs/{job_id}")
def delete_job(job_id: int):
    db = SessionLocal()
    job = db.query(Job).filter(Job.id == job_id).first()

    if not job:
        db.close()
        raise HTTPException(status_code=404, detail="Job not found")

    deleted_job = job_to_dict(job)

    db.delete(job)
    db.commit()
    db.close()

    return {
        "status": "deleted",
        "deleted_job": deleted_job,
    }


@app.delete("/jobs")
def delete_all_jobs():
    db = SessionLocal()
    deleted_count = db.query(Job).count()
    db.query(Job).delete()
    db.commit()
    db.close()

    return {
        "status": "all_jobs_deleted",
        "deleted_count": deleted_count,
    }


@app.post("/jobs/scrape")
def scrape_jobs(request: JobScrapeRequest):
    raw_jobs = scrape_indeed_jobs(
        position=request.position,
        location=request.location,
        max_items=request.max_items,
    )

    db = SessionLocal()
    saved_jobs = []

    for raw_job in raw_jobs:
        job_data = extract_job_features(raw_job)

        if not job_data.get("company_name") and not job_data.get("job_title"):
            continue

        existing_job = None
        if job_data.get("source_url"):
            existing_job = db.query(Job).filter(
                Job.source_url == job_data["source_url"]
            ).first()

        if existing_job:
            continue

        new_job = Job(**job_data)
        db.add(new_job)
        db.commit()
        db.refresh(new_job)

        saved_jobs.append(job_to_dict(new_job))

    db.close()

    return {
        "status": "scrape_complete",
        "raw_count": len(raw_jobs),
        "saved_count": len(saved_jobs),
        "saved_jobs": saved_jobs,
    }


# -------------------------
# Benchmarks
# -------------------------

@app.post("/benchmarks")
def create_benchmark(benchmark: WageBenchmarkCreate):
    db = SessionLocal()

    weekly = benchmark.weekly_median_wage

    if weekly is None and benchmark.annual_median_wage:
        weekly = benchmark.annual_median_wage / 52

    new_benchmark = WageBenchmark(
        state=benchmark.state.upper(),
        annual_median_wage=benchmark.annual_median_wage,
        weekly_median_wage=weekly,
        year=benchmark.year,
    )

    db.add(new_benchmark)
    db.commit()
    db.refresh(new_benchmark)

    saved_id = new_benchmark.id
    db.close()

    return {
        "status": "benchmark_saved",
        "benchmark_id": saved_id,
        "weekly_median_wage": weekly,
    }


@app.get("/benchmarks")
def get_benchmarks():
    db = SessionLocal()
    benchmarks = db.query(WageBenchmark).order_by(WageBenchmark.id.desc()).all()
    result = [benchmark_to_dict(b) for b in benchmarks]
    db.close()

    return {
        "count": len(result),
        "benchmarks": result,
    }


@app.put("/benchmarks/{benchmark_id}")
def update_benchmark(benchmark_id: int, update: WageBenchmarkUpdate):
    db = SessionLocal()
    benchmark = db.query(WageBenchmark).filter(
        WageBenchmark.id == benchmark_id
    ).first()

    if not benchmark:
        db.close()
        raise HTTPException(status_code=404, detail="Benchmark not found")

    update_data = update.model_dump(exclude_unset=True)

    if "state" in update_data and update_data["state"]:
        update_data["state"] = update_data["state"].upper()

    if "annual_median_wage" in update_data and "weekly_median_wage" not in update_data:
        annual = update_data.get("annual_median_wage")
        if annual:
            update_data["weekly_median_wage"] = annual / 52

    for key, value in update_data.items():
        setattr(benchmark, key, value)

    db.commit()
    db.refresh(benchmark)

    updated_benchmark = benchmark_to_dict(benchmark)
    db.close()

    return {
        "status": "updated",
        "benchmark": updated_benchmark,
    }


@app.delete("/benchmarks/{benchmark_id}")
def delete_benchmark(benchmark_id: int):
    db = SessionLocal()
    benchmark = db.query(WageBenchmark).filter(
        WageBenchmark.id == benchmark_id
    ).first()

    if not benchmark:
        db.close()
        raise HTTPException(status_code=404, detail="Benchmark not found")

    deleted_benchmark = benchmark_to_dict(benchmark)

    db.delete(benchmark)
    db.commit()
    db.close()

    return {
        "status": "deleted",
        "deleted_benchmark": deleted_benchmark,
    }


@app.delete("/benchmarks")
def delete_all_benchmarks():
    db = SessionLocal()
    deleted_count = db.query(WageBenchmark).count()
    db.query(WageBenchmark).delete()
    db.commit()
    db.close()

    return {
        "status": "all_benchmarks_deleted",
        "deleted_count": deleted_count,
    }


# -------------------------
# Matching
# -------------------------

@app.get("/drivers/{driver_id}/match-jobs")
def match_driver_with_jobs(driver_id: int):
    db = SessionLocal()

    driver = db.query(Driver).filter(Driver.id == driver_id).first()

    if not driver:
        db.close()
        raise HTTPException(status_code=404, detail="Driver not found")

    jobs = db.query(Job).all()

    if not jobs:
        db.close()
        return {
            "driver_id": driver_id,
            "matches": [],
            "message": "No jobs found. Add or scrape jobs first.",
        }

    benchmark_weekly = get_benchmark_for_state(db, driver.home_state)

    matches = []

    for job in jobs:
        match = calculate_job_match(driver, job, benchmark_weekly)
        matches.append(match)

    matches.sort(key=lambda x: x["compatibility_score"], reverse=True)

    db.close()

    return {
        "driver": driver_to_dict(driver),
        "benchmark_weekly_used": benchmark_weekly,
        "matches": matches[:10],
    }