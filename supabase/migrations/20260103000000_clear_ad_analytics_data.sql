-- Clear all ad analytics performance data
-- This migration removes all impression and click events from ad_analytics table
-- Created: 2026-01-03

DELETE FROM ad_analytics;
