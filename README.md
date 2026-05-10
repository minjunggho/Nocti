# Nocti

**Nocti** is an AI-powered trucking labor marketplace designed to help truck drivers and trucking companies find better matches faster.

But Nocti is not just AI trucking software.

Nocti is built to protect the people behind the supply chain: the drivers who spend long hours on the road, the companies trying to keep operations moving, and the human relationships that hold logistics together.

At its core, **Nocti is AI repairing the broken human relationships inside the logistics industry**. By giving drivers and trucking companies clearer visibility into each other’s needs, expectations, and values, Nocti helps create better matches, stronger trust, and healthier long-term working relationships.

Built for **HackDavis 2026** by **Nocteam**.

---

## The Problem

The trucking industry has a serious churn problem.

Drivers often move from company to company because they lack clear visibility into better opportunities, fair pay, route options, home-time expectations, and company culture. At the same time, trucking companies struggle to find, vet, and retain qualified drivers.

This creates a cycle where drivers are constantly playing “musical chairs” with trucking companies, while companies spend more and more money onboarding new drivers who may leave shortly after being hired.

The root problem is a lack of visibility on both sides of the market.

---

## The Driver Side

Truck drivers often do not have a clear way to compare:

- Which companies are hiring
- What different companies actually offer
- Whether their current pay is fair
- Which routes are available
- What home-time schedules different companies provide
- What equipment types they can drive
- How different companies treat their drivers
- Whether another company would better fit their lifestyle and goals

Many drivers rely on Facebook groups, other drivers, recruiters, or word of mouth. This process is slow, stressful, inconsistent, and often not transparent enough.

Drivers have market value, but many do not have a clear way to see it.

---

## The Company Side

Trucking companies struggle to know:

- Which drivers are actively looking
- Which drivers may be open to switching
- What drivers actually want
- Whether a driver is a good fit before onboarding
- Why drivers leave after being hired
- How to reduce recruiting waste
- How to retain drivers long-term

Many companies depend on Facebook ads, word of mouth, referrals, or expensive recruiting pipelines. These methods can be costly, time-consuming, and not vetted enough.

Companies need better visibility into the driver market before they spend money onboarding someone who may not be the right fit.

---

## Our Solution

Nocti gives both drivers and trucking companies better visibility into the trucking labor market.

The first version of Nocti focuses on an **AI voice interview system**. A driver can call and speak naturally with Nocti, the AI voice assistant. Nocti asks targeted questions, listens to the driver’s answers, and converts the conversation into structured driver data.

That information is then stored in a backend database and used to create a driver profile that trucking companies can review.

In the future, drivers will also be able to create accounts, view their own information, update their preferences, and discover trucking companies that match their needs.

---

## What Nocti Does

Nocti helps transform messy, unstructured driver conversations into organized, useful recruiting intelligence.

Instead of forcing drivers to fill out long forms, Nocti allows them to simply talk.

The system collects information such as:

- Driver experience
- CDL status
- Route preferences
- Home-time needs
- Current pay
- Desired pay
- Equipment experience
- Endorsements
- Current job satisfaction
- Reasons for wanting to switch
- Dispatcher preferences
- Availability
- Burnout indicators
- Retention fit signals

This gives trucking companies a clearer picture of each driver before starting the recruiting or onboarding process.

---

## Why Voice AI?

Many drivers do not want to fill out long online forms. A phone call feels more natural, faster, and more accessible.

Nocti uses voice AI because it allows drivers to explain their situation in their own words.

Instead of only collecting checkbox answers, Nocti can capture deeper context such as:

- Why a driver is unhappy
- What kind of dispatcher they work best with
- Whether pay, home time, route type, or company culture matters most
- Whether they are actively looking or just exploring better options
- What would make them stay longer at a company

This makes the driver profile more human, more accurate, and more valuable.

---

## How It Works

```text
Driver calls Nocti
        ↓
AI voice assistant asks natural interview questions
        ↓
Driver answers by voice
        ↓
Nocti extracts structured information
        ↓
Backend stores the driver profile
        ↓
Companies view available drivers
        ↓
Drivers and companies find better matches
```

---

## Core Features

### Current MVP Focus

- AI voice assistant for driver interviews
- Natural phone-call-based onboarding
- Driver information collection
- Structured driver profile generation
- Backend API for storing and retrieving driver data
- Database-backed driver records
- Frontend integration with React
- Company-side visibility into available drivers

### Backend Features

- Create driver profile
- Get driver profile
- Edit driver profile
- Remove driver profile
- Store driver information in database
- Support frontend dashboard integration
- Support future Vapi integration
- Support future company dashboard
- Support future driver account system

### Planned Frontend Features

- Driver dashboard
- Company dashboard
- Driver profile page
- Company browsing page
- Search and filter available drivers
- View driver fit information
- View route, pay, experience, and preference data

---

## Driver Information Collected

Nocti is designed to collect important driver-side data such as:

- Full name
- Phone number
- Email
- CDL status
- Years of driving experience
- Current employment status
- Current company
- Route type
- Home-time preference
- Equipment experience
- Endorsements
- Current pay structure
- Desired pay
- What the driver likes about their current job
- What the driver dislikes about their current job
- Availability to switch companies
- Preferred dispatcher style
- Burnout risk indicators
- Retention fit signals

---

## Example Driver Profile

```json
{
  "name": "Markus Reed",
  "phone": "+1 555 123 4567",
  "email": "markus@example.com",
  "cdl_status": "CDL-A",
  "years_experience": 6,
  "route_type": "Regional",
  "home_time": "Weekends",
  "equipment_experience": ["Dry Van", "Reefer"],
  "endorsements": ["Tanker"],
  "current_pay": "$0.62 per mile",
  "desired_pay": "$0.70 per mile",
  "current_company": "Example Logistics",
  "looking_status": "Open to better opportunities",
  "likes_current_job": "Steady miles and good equipment",
  "dislikes_current_job": "Poor communication from dispatch",
  "dispatcher_style": "Respectful and consistent communication",
  "burnout_risk": "Medium",
  "retention_score": 82
}
```

---

## Product Vision

Nocti is not just a recruiting form.

The long-term goal is to become a trucking labor intelligence platform that helps:

- Drivers understand their market value
- Companies find better-fit drivers
- Recruiters reduce wasted outreach
- The industry reduce churn
- Both sides make decisions with clearer information
- Driver-company relationships become more transparent and sustainable

Nocti aims to make trucking recruitment more human, efficient, and data-driven.

---

## Tech Stack

### Backend

- Python
- FastAPI
- Uvicorn
- SQLAlchemy
- Pydantic
- SQLite / database storage
- Python dotenv
- REST API architecture

### Voice AI

- Vapi
- Phone-based AI voice interview flow
- Structured data extraction from conversation
- Driver intake automation

### Frontend

- React-based frontend
- Driver dashboard
- Company dashboard
- API integration with backend

### Development Tools

- Git
- GitHub
- VS Code
- PowerShell
- ngrok
- Python virtual environment

---

## Project Structure

```text
Nocti/
│
├── backend/
│   ├── main.py
│   ├── requirements.txt
│   ├── .env.example
│   ├── .gitignore
│   └── README.md
│
└── frontend/
    └── React
```

---

## Environment Variables

Create a `.env` file inside the backend folder.

Example:

```env
APIFY_API_TOKEN=your_apify_token_here

TWILIO_ACCOUNT_SID=your_twilio_account_sid_here
TWILIO_AUTH_TOKEN=your_twilio_auth_token_here
TWILIO_PHONE_NUMBER=your_twilio_phone_number_here

EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email_here
EMAIL_PASSWORD=your_email_app_password_here

DATABASE_URL=your_database_url_here
```

Do **not** upload `.env` to GitHub.

Only upload `.env.example`.

---

## Installation

Clone the repository:

```bash
git clone https://github.com/minjunggho/Nocti.git
cd Nocti
```

Go into the backend folder:

```bash
cd backend
```

Create a virtual environment:

```bash
python -m venv venv
```

Activate the virtual environment.

On Windows PowerShell:

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy RemoteSigned
.\venv\Scripts\Activate.ps1
```

Install dependencies:

```bash
pip install -r requirements.txt
```

---

## Running the Backend

Start the FastAPI server:

```bash
uvicorn main:app --reload
```

The backend will run locally at:

```text
http://127.0.0.1:8000
```

FastAPI interactive API documentation is available at:

```text
http://127.0.0.1:8000/docs
```

---

## Connecting the Frontend

During development, the backend can be exposed using ngrok:

```bash
ngrok http 8000
```

Copy the HTTPS forwarding URL and use it as the API base URL in the frontend.

Example:

```text
https://your-ngrok-url.ngrok-free.dev
```

The frontend should send requests to the backend using this base URL.

---

## API Overview

The backend supports core driver and account operations such as:

```text
POST   /drivers
GET    /drivers
GET    /drivers/{driver_id}
PUT    /drivers/{driver_id}
DELETE /drivers/{driver_id}

POST   /login
POST   /verify-email
POST   /send-verification
```

Exact endpoint names may change as the backend develops.

---

## Hackathon Demo Flow

A strong demo flow for Nocti:

```text
1. Driver calls Nocti
2. Nocti asks natural interview questions
3. Driver answers by voice
4. Nocti extracts structured data
5. Backend stores the driver profile
6. Company dashboard displays the driver
7. Company can review fit, preferences, and availability
```

This demonstrates the full value of Nocti: turning an unstructured driver conversation into useful recruiting intelligence.

---

## GitHub Security Notes

Before pushing to GitHub, make sure these files are ignored:

```gitignore
.env
venv/
__pycache__/
*.pyc
*.db
```

Never commit:

- API keys
- Twilio credentials
- Apify tokens
- Email app passwords
- Database passwords
- Private `.env` files

If a secret is accidentally committed, rotate the key immediately and remove it from Git history.

---

## Development Roadmap

### MVP

- Build Vapi voice interview agent
- Collect driver responses through phone calls
- Store driver data in backend database
- Display driver profiles in dashboard
- Allow companies to view available drivers

### Next Steps

- Improve voice interview flow
- Add better structured extraction
- Add driver account creation
- Add company account creation
- Add driver login and dashboard
- Add company dashboard
- Add profile editing
- Add search and filtering
- Add match scoring
- Add burnout risk analysis
- Add retention fit score
- Deploy backend to a cloud server
- Connect production frontend and backend

### Future Vision

- Driver-company matching algorithm
- Market value estimator for drivers
- Company reputation insights
- Anonymous driver market data
- Recruiter workflow automation
- SMS follow-ups
- Verified CDL and endorsement checks
- Predictive retention analytics

---

## Team

Built by **Nocteam** for **HackDavis 2026**.

---

## Mission

Nocti’s mission is to reduce churn in trucking by helping drivers and trucking companies understand each other before the hire happens.

Better visibility creates better matches.  
Better matches create better retention.  
Better retention protects the humans behind the supply chain.
