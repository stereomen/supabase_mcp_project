# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

When creating a Python function, write a brief summary of its functionality at the very top. If there are input and output files, include them as well.

## Development Commands

### Supabase Local Development
- Start local Supabase: `supabase start`
- Connect to project: `supabase link --project-ref <PROJECT_ID>`
- Deploy function: `supabase functions deploy <FUNCTION_NAME>`
- Apply migrations: `supabase db push`
- Reset local database: `supabase db reset`
- View logs: `supabase functions logs <FUNCTION_NAME>`

### Available Functions to Deploy
- `mcp-server`: Marine observation data API server (hybrid GET/POST)
- `fetch-kma-data`: Data collection from KMA API (scheduled)
- `get-kma-weather`: Weather data fetching
- `get-medm-weather`: Medium-term weather forecast data collection from KMA API (scheduled)
- `get-weather-tide-data`: Integrated weather and tide data API
- `import-tide-data`: Tide data import functionality
- `analyze-data`: Data analysis functions
- `send-firebase-notification`: Firebase Cloud Messaging push notification sender for Android apps
- `manage-firebase-remote-config`: Firebase Remote Config management API with web UI

### Node.js Commands
- Install dependencies: `npm install`
- Run Python scripts: `python3 <script_name>.py`

## Architecture Overview

This is a **Marine Weather Observation Platform** (MCP) that collects and serves marine meteorological data from the Korea Meteorological Administration (KMA). The system is built on Supabase with serverless Edge Functions.

### Core Data Flow
1. **Data Collection**: `fetch-kma-data` function periodically fetches data from KMA API
2. **Data Storage**: Marine observations stored in PostgreSQL tables with both UTC and KST timestamps
3. **Data Serving**: Multiple API endpoints serve different data combinations (weather, tide, observations)

### Key Supabase Edge Functions
- **mcp-server**: Hybrid API supporting both RESTful GET requests and MCP-protocol POST requests for marine observation data
- **get-weather-tide-data**: Main API endpoint returning integrated weather forecasts, tide data, and marine observations
- **fetch-kma-data**: Scheduled data collector that fetches from KMA API and populates `marine_observations` table
- **get-medm-weather**: Medium-term forecast collector that fetches 3 types of KMA medium-term forecasts (land/temperature/marine) and populates `medium_term_forecasts` table

### Database Schema
- **marine_observations**: Core table storing marine meteorological data with UTC/KST timestamps
- **weather_forecasts**: 7-day weather prediction data by location
- **medium_term_forecasts**: Medium-term weather forecast data (3-7 day forecasts) for land/temperature/marine types
- **tide_data**: 14-day tide level information
- **locations**: Location master data with support flags for different data types
- **tide_abs_region** & **tide_weather_region**: Regional mapping tables

### Authentication & Security
- Functions use Supabase service role keys for database access
- mcp-server includes authKey validation against SUPABASE_ANON_KEY
- CORS headers configured in `_shared/cors.ts`

## File Structure Conventions

### Function Organization
- Each function in separate directory under `supabase/functions/`
- Each function has its own `deno.json` for import configuration
- Shared utilities in `supabase/functions/_shared/`

### Database Migrations
- All schema changes go through migration files in `supabase/migrations/`
- Migrations include detailed comments and follow Korean naming conventions

### Documentation
- Function documentation in `docs/functions/` with Korean descriptions
- API specifications in `API_SPECIFICATION.md`

### Netlify Admin UI
- Web-based management interface in `netlify/` directory
- Static HTML pages for Firebase Remote Config management and push notification sending
- Deployed separately via Netlify for easy access without Edge Function GET endpoints
- See `netlify/README.md` for deployment instructions

## Environment Variables Required

```bash
SUPABASE_URL=your-supabase-url
SUPABASE_ANON_KEY=your-anon-key  
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
KMA_AUTH_KEY=your-kma-api-key  # Required for get-kma-weather and get-medm-weather functions
FIREBASE_SERVICE_ACCOUNT_KEY=your-firebase-service-account-json  # Required for send-firebase-notification and manage-firebase-remote-config functions (JSON string)
FIREBASE_SERVER_KEY=your-firebase-server-key  # Optional: Firebase legacy server key for fallback
ADMIN_SECRET=your-admin-password  # Required for manage-firebase-remote-config function
```

## Code Style Guidelines

Based on existing code patterns:
- Use TypeScript with Deno runtime for Edge Functions
- Include comprehensive error handling with `console.error` logging
- Follow Korean documentation standards (comments/logs in Korean where appropriate)
- Use `createClient` from `@supabase/supabase-js@2` for database connections
- Implement proper CORS handling using shared cors module
- Database column naming uses snake_case
- Time handling: Store both UTC and KST versions of timestamps

## API Design Patterns

- GET APIs use query parameters for filtering (code, date, time)
- Consistent error response format with `error` field
- Support optional time filtering in HHMM format
- Return empty arrays rather than null for missing data
- Use RPC functions for complex database queries
- Implement data type mapping (wd=wind_direction, tw=water_temperature, wh=wave_height)

## Regional Data Support

The system supports Korean marine weather stations with:
- Station ID mapping for different observation types
- Location-based data availability flags
- Regional code mapping between different data sources (ABS, KMA)