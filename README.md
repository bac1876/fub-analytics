# FUB Analytics - Follow Up Boss Conversion Dashboard

Real-time analytics dashboard for tracking conversion metrics from Follow Up Boss CRM.

## Features

- **Conversion Funnel**: Visualize Calls → Appointments → Contracts → Closings
- **Appointment Breakdown**: By type (Listing, Buyer consultation, etc.)
- **Outcome Tracking**: See percentages for each appointment outcome
- **Agent Comparison**: Compare metrics across team members
- **Time Filtering**: MTD, YTD, last 30/90 days, or custom date ranges
- **Personal/Team Views**: Toggle between individual and team-wide metrics
- **Auto-refresh**: Data updates every 5 minutes automatically

## Quick Start

### 1. Install Dependencies
```bash
npm run install:all
```

### 2. Configure API Key
Edit `.env` file with your Follow Up Boss API key:
```
FUB_API_KEY=your_api_key_here
```

### 3. Run the Application
```bash
npm run dev
```

This starts both the backend server (port 5000) and React frontend (port 3000).

## API Endpoints

| Endpoint | Description |
|----------|-------------|
| GET /api/analytics/metrics | Get all metrics for date range |
| GET /api/analytics/compare | Compare two time periods |
| GET /api/analytics/agent/:userId | Get agent-specific metrics |
| GET /api/analytics/users | List all agents |
| GET /api/analytics/appointment-types | Get appointment types |
| GET /api/analytics/appointment-outcomes | Get appointment outcomes |
| GET /api/analytics/pipelines | Get pipelines and stages |
| GET /api/analytics/quick-stats | Quick stats for dashboard |

## Metrics Tracked

- **Calls**: Total calls logged in FUB
- **Appointments**: All appointments by type
- **Contracts**: Deals in contract/pending stages
- **Closings**: Deals in closed stages

## Tech Stack

- **Backend**: Node.js + Express
- **Frontend**: React + Chart.js
- **API**: Follow Up Boss REST API
