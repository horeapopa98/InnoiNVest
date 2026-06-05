// Cache TTLs in seconds. Source data changes rarely, so TTLs are generous —
// tune down if the underlying datasets start updating more frequently.
const HOUR = 60 * 60;
const DAY = 24 * HOUR;

module.exports = {
  TTL: {
    ARCGIS: 12 * HOUR, // INNO ArcGIS feature layers (properties + infrastructure)
    INNO_LISTINGS: 6 * HOUR, // scraped HTML listings
    PROINFRA: 6 * HOUR, // ProInfrastructura GeoJSON + lot limits
    GEOCODE: 30 * DAY, // place coordinates are effectively immutable
    REPORT: 12 * HOUR, // assembled per-property investment report
  },
};
