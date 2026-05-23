-- Allow KPIs aggregated at the NUTS2 region level (e.g. R&D, tourism that
-- Eurostat publishes only at RO11 for the entire North-West).

ALTER TABLE kpi DROP CONSTRAINT IF EXISTS kpi_aggregation_level_check;
ALTER TABLE kpi ADD CONSTRAINT kpi_aggregation_level_check
    CHECK (aggregation_level IN ('commune','county','region','country'));
