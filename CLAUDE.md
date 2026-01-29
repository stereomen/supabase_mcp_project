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
- `get-ad-weather-data`: Weather + tide data with integrated ad serving
- `import-tide-data`: Tide data import functionality
- `analyze-data`: Data analysis functions
- `send-firebase-notification`: Firebase Cloud Messaging push notification sender for Android apps
- `manage-firebase-remote-config`: Firebase Remote Config management API with web UI
- `manage-ad-repo`: Ad campaign CRUD operations
- `track-ad-event`: Ad impression/click event tracking
- `manage-ad-partners`: Partner management (legacy - use web UI instead)
- `partner-auth`: Partner authentication API

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
- **get-ad-weather-data**: Enhanced weather API with integrated ad serving - automatically serves relevant ads based on location/station
- **fetch-kma-data**: Scheduled data collector that fetches from KMA API and populates `marine_observations` table
- **get-medm-weather**: Medium-term forecast collector that fetches 3 types of KMA medium-term forecasts (land/temperature/marine) and populates `medium_term_forecasts` table
- **manage-ad-repo**: REST API for ad campaign management (list, create, update, delete campaigns)
- **track-ad-event**: Event tracking API for recording ad impressions and clicks

### Database Schema

#### Core Marine Data
- **marine_observations**: Core table storing marine meteorological data with UTC/KST timestamps
- **weather_forecasts**: 7-day weather prediction data by location
- **medium_term_forecasts**: Medium-term weather forecast data (3-7 day forecasts) for land/temperature/marine types
- **tide_data**: 14-day tide level information
- **locations**: Location master data with support flags for different data types
- **tide_abs_region** & **tide_weather_region**: Regional mapping tables

#### Ad System
- **ad_partners**: Partner/advertiser information with contact details and business metadata
- **ad_repo**: Ad campaign repository with targeting (station/area), display periods, and priority
- **ad_analytics**: Event tracking table for impressions and clicks with timestamp and metadata
- **ad_repo_view**: Enriched view joining campaigns with partner data and calculated active status
- **ad_analytics_daily_summary**: View aggregating daily performance metrics (impressions, clicks, CTR)
- **ad_analytics_campaign_summary**: View showing overall campaign performance across all time

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
- **Ad System Management Pages:**
  - `ad-partners.html`: Partner registration and management
  - `ad-post.html`: Ad campaign creation and management
  - `ad-analytics.html`: Performance dashboard with impressions, clicks, and CTR
  - `ad-partner-analytics.html`: Partner-specific analytics view
  - `run-migration.html`: Database migration utility for ad system setup
- Deployed separately via Netlify for easy access without Edge Function GET endpoints
- Live URL: https://mancool.netlify.app
- See `docs/AD_SYSTEM_DEPLOYMENT_GUIDE.md` for complete ad system documentation

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

## Supabase Query Best Practices

### Row Limit Warning
**CRITICAL**: Supabase REST API has a default limit of **1000 rows** per query. When querying tables that may contain more than 1000 records, you MUST implement pagination to retrieve all data.

**Common Issues:**
- Date range queries that span multiple days may return incomplete results
- Analytics and log tables (`abs_fetch_log`, `ad_analytics`, etc.) grow over time and will exceed 1000 rows
- Admin UI pages that analyze full datasets need pagination

**Solutions:**

1. **JavaScript/TypeScript (Supabase JS Client):**
```javascript
// ❌ BAD - Only gets first 1000 rows
const { data } = await supabase.from('abs_fetch_log').select('*');

// ✅ GOOD - Pagination with range()
let allData = [];
let from = 0;
const batchSize = 1000;
let hasMore = true;

while (hasMore) {
    const { data, error } = await supabase
        .from('abs_fetch_log')
        .select('*')
        .range(from, from + batchSize - 1);

    if (error) throw error;
    allData = allData.concat(data);

    if (data.length < batchSize) {
        hasMore = false;
    } else {
        from += batchSize;
    }
}
```

2. **REST API with fetch():**
```javascript
// ✅ GOOD - Pagination with offset/limit
let allData = [];
let offset = 0;
const limit = 1000;
let hasMore = true;

while (hasMore) {
    const url = `${SUPABASE_URL}/rest/v1/table_name?select=*&limit=${limit}&offset=${offset}`;
    const response = await fetch(url, { headers: { ... } });
    const pageData = await response.json();

    allData = allData.concat(pageData);

    if (pageData.length < limit) {
        hasMore = false;
    } else {
        offset += limit;
    }
}
```

**Files that implement pagination correctly:**
- `netlify/abs-fetch-log-coverage.html`: Date range analysis with pagination
- `netlify/station-matcher.html`: Full table scan with pagination

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

## Ad System Architecture

### Overview
The platform includes a comprehensive advertising system for serving location-targeted ads to marine weather app users. The system supports partner management, campaign creation, ad serving, and performance analytics.

### Ad Serving Flow
1. **Client Request**: App calls `get-ad-weather-data` API with station code or area
2. **Ad Selection**: Function queries `get_active_ads_for_station()` or `get_active_ads_for_area()` RPC
3. **Priority Matching**: Returns highest-priority active ad matching the location and current date
4. **Automatic Impression Tracking**: Impression event automatically recorded when ad is served
5. **Manual Click Tracking**: Client must call `track-ad-event` API when user clicks ad

### Campaign Targeting
- **Station-based**: Target specific observation stations (e.g., DT_0001, DT_0005)
- **Area-based**: Target entire regions (서해북부, 남해동부, 동해중부, etc.)
- **National**: Leave targeting empty to show across all locations
- **Priority System**: Higher priority (0-100) ads are shown first when multiple campaigns match

### Performance Tracking
- **Impressions**: Automatically tracked when `get-ad-weather-data` returns an ad
- **Clicks**: Explicitly tracked via `track-ad-event` POST request from client
- **CTR Calculation**: Click-through rate computed in real-time via database views
- **Daily/Campaign Aggregation**: Performance metrics available at both daily and lifetime levels

### Web Management Interface
All ad operations can be performed through the Netlify-hosted admin UI:
- Partner registration with business metadata
- Campaign creation with rich targeting options
- Real-time analytics dashboard with CTR visualization
- Partner-specific performance views

### Database Functions
- `get_active_ads_for_station(station_id, date)`: Returns active ad for specific station
- `get_active_ads_for_area(area, date)`: Returns active ad for geographic area
- `set_ad_analytics_event_date()`: Trigger function to auto-populate event dates