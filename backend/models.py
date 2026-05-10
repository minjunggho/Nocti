from sqlalchemy import Column, Integer, String, Float, DateTime, Text, Boolean
from datetime import datetime
from database import Base


class Driver(Base):
    __tablename__ = "drivers"

    id = Column(Integer, primary_key=True, index=True)

    name = Column(String, nullable=True)
    email = Column(String, nullable=True)
    email_confirmed = Column(Boolean, default=False)
    database_consent = Column(Boolean, default=False)
    experience_years = Column(Integer, nullable=True)
    vehicle_type = Column(String, nullable=True)

    

    home_city = Column(String, nullable=True)
    home_state = Column(String, nullable=True)

    preferred_lane_type = Column(String, nullable=True)
    desired_home_time = Column(String, nullable=True)
    pay_priority = Column(String, nullable=True)
    communication_preference = Column(Text, nullable=True)
    burnout_concerns = Column(Text, nullable=True)

    email_verification_code = Column(String, nullable=True)
    email_verification_expires_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class Job(Base):
    __tablename__ = "jobs"

    id = Column(Integer, primary_key=True, index=True)

    company_name = Column(String, nullable=True)
    job_title = Column(String, nullable=True)
    location = Column(String, nullable=True)
    state = Column(String, nullable=True)

    source = Column(String, default="Indeed")
    source_url = Column(Text, nullable=True)

    salary_text = Column(String, nullable=True)
    job_description = Column(Text, nullable=True)
    employment_type = Column(String, nullable=True)
    rating = Column(String, nullable=True)

    route_type = Column(String, nullable=True)
    equipment_type = Column(String, nullable=True)
    home_time = Column(String, nullable=True)
    pay_model = Column(String, nullable=True)
    estimated_weekly_pay = Column(Float, nullable=True)
    detention_pay_mentioned = Column(String, nullable=True)
    experience_required = Column(Integer, nullable=True)
    benefits_mentioned = Column(String, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)


class WageBenchmark(Base):
    __tablename__ = "wage_benchmarks"

    id = Column(Integer, primary_key=True, index=True)

    state = Column(String, nullable=False)
    occupation = Column(String, default="Heavy and Tractor-Trailer Truck Drivers")
    annual_median_wage = Column(Float, nullable=True)
    weekly_median_wage = Column(Float, nullable=True)
    source = Column(String, default="BLS")
    year = Column(Integer, nullable=True)