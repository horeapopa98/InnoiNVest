# InnoINVest — Data Categories & Sources

Reverse-engineered from the **Florești / FinDreams 2025** investor brief
(`Copy of INNO, Florești, 01 AUGUST (1).pdf`, 29 pages).

Each section lists: (1) the data points investors actually want, and (2) the open / authoritative sources where they can be pulled — international first, then Romania-specific.

---

## 1. Strategic Location & Logistics
*Pages 2, 6, 8 — "Overnight delivery to", distances to ports/customs/airports/highways.*

**Data points:** distances to major cities & EU capitals, drive-time isochrones, distance to highways / airports / sea ports / border customs, road class, rail connectivity.

**Sources:**
- OpenStreetMap (OSM) + Overpass API — road network, rail, POIs
- OpenRouteService / GraphHopper / Mapbox / Google Maps Distance Matrix API — drive-time matrices, isochrones
- Eurostat Transport (`tran_*`) — TEN-T corridors, port/airport throughput
- CNAIR (cnair.ro) — Romanian national roads & highways inventory
- CFR (cfr.ro / cfrcalatori.ro) — rail network, stations, schedules
- Aviația Civilă Română (caa.ro) — airports & runways
- ENTSO-E + Copernicus (for road conditions / EO)

---

## 2. Macro-Economic Indicators
*Pages 2, 4, 18 — GDP/capita, EU absorption, FOB exports, gross monthly income, active businesses, tourists, fastest-growing county ranking.*

**Data points:** regional GDP & GDP/capita (NUTS3), GVA by sector, exports/imports (FOB/CIF), EU funds absorption, inflation, registered businesses, business density, tourism arrivals/overnights.

**Sources:**
- Eurostat — `nama_10r_3gdp` (regional GDP NUTS3), `tour_occ_*`, `htec_*`
- World Bank Open Data (`api.worldbank.org`)
- OECD Regional Database / OECD.Stat
- INS / Tempo Online (insse.ro) — Romanian regional statistics
- BNR (bnro.ro) — exports, FDI, balance of payments
- ONRC (onrc.ro) — Trade Registry, business creation
- listafirme.ro / termene.ro — company registry mirrors (more usable API)
- MFP — EU funds absorption (mfe.gov.ro)

---

## 3. Quality of Life, Safety & Liveability
*Page 3 — Numbeo safety index, EC Quality of Life in European Cities, "10th most liveable".*

**Data points:** crime/safety index, liveability ranking, resident satisfaction, air & noise pollution, healthcare quality perception.

**Sources:**
- Numbeo (numbeo.com) — crime, cost of living, quality of life indices
- European Commission — *Quality of Life in European Cities* survey (DG REGIO)
- Eurostat Urban Audit (`urb_*`)
- Mercer Quality of Living rankings
- IQAir / OpenAQ — air quality
- Copernicus Atmosphere Monitoring Service (CAMS)

---

## 4. Demographics
*Pages 4, 19, 20 — population, age distribution by year, catchment within 50 km.*

**Data points:** total population & trend, age pyramid, working-age (15–64), education attainment, migration flows, catchment population by drive-time radius.

**Sources:**
- INS Tempo Online (statistici.insse.ro) — Romanian census + yearly updates
- Eurostat `demo_*` and `cens_*` — NUTS3 demographics, census
- World Bank Population & Development
- GHS-POP (JRC Global Human Settlement Layer) — gridded population, perfect for drive-time catchments
- WorldPop (worldpop.org)
- Local primării (e.g., primariafloresti.ro) — registered population

---

## 5. Land, Real Estate & Construction
*Page 6 — 200 HA, ownership mix, lease €/m²/year, build cost €400–1000/m², reno €350–550/m².*

**Data points:** parcel size & boundaries, public vs. private ownership, zoning (PUG), concession/lease prices, land/construction/renovation cost benchmarks, available industrial/logistics inventory.

**Sources:**
- ANCPI / eTerra (ancpi.ro) — national cadastre & land registry
- INSPIRE Geoportal (inspire-geoportal.ec.europa.eu) — EU cadastral & spatial
- Local PUG/PUZ from primării — urban zoning plans
- Imobiliare.ro, Storia.ro, OLX, Anunturi-Imobiliare — listings price scrape
- CBRE / Colliers / Cushman & Wakefield — annual industrial market reports
- INS construction cost indices (IC ind.)
- Geoportal ANCPI (geoportal.ancpi.ro) — WMS layers

---

## 6. Transportation Infrastructure (Existing & Planned)
*Pages 8, 9 — A3 highway, airports, customs, planned beltway TR35 (€1.2 B), photovoltaic park, retail parks.*

**Data points:** highway/road network, rail, airports, ports, public transit, planned megaprojects with budgets & timelines.

**Sources:**
- CNAIR (cnair.ro) — national road projects pipeline
- Ministerul Transporturilor (mt.ro)
- CFR Infrastructură (cfr.ro)
- ADR Nord-Vest (nord-vest.ro) — regional development programs
- EU CEF / TEN-T project database (ec.europa.eu/inea)
- SEAP / e-licitatie.ro — public procurement → infrastructure tenders
- OpenStreetMap (planned/proposed tags)

---

## 7. Utilities (Electricity, Gas, Water, Sewage)
*Pages 10–14 — substations & distances, €/kWh, €/Nm³ gas, water river capacity, sewage capacity.*

**Data points:** grid capacity, distance to nearest substation, voltage levels, industrial electricity & gas tariffs, water/sewer access points & capacity, renewable energy share, CO₂ intensity.

**Sources:**
- ANRE (anre.ro) — energy tariffs, grid operators
- Transelectrica (transelectrica.ro) — high-voltage grid map & substations
- Distribuție Energie Electrică Romania (DEER) — regional MV/LV grid
- Delgaz Grid / Distrigaz Sud — gas network
- Apele Române (rowater.ro) — water resources, river capacity
- ANAR (anar.ro) — water management plans
- ENTSO-E Transparency Platform — EU electricity prices & flows
- Eurostat Energy (`nrg_*`)
- Copernicus CAMS — CO₂ / pollutant footprint
- OpenInfraMap (openinframap.org) — crowdsourced grid map

---

## 8. Health Infrastructure
*Page 15 — €762 M Cluj Regional Emergency Hospital, completion 2028.*

**Data points:** hospital beds per capita, planned health projects, doctors per 1k, medical specializations.

**Sources:**
- Ministerul Sănătății (ms.ro)
- CNAS (cnas.ro) — health insurance + hospital network
- INS health statistics
- Eurostat Health (`hlth_*`)
- WHO Europe Health for All database
- DSP județene — county-level public health directorates

---

## 9. Labor Market & Human Resources
*Pages 17–21 — employment rate, unemployment, gross/net salary by role, sectoral breakdown, catchment workforce, full cost breakdown by role.*

**Data points:** working-age population, employment & unemployment rate, salary by occupation/sector/experience, sectoral employment shares, labor cost composition (gross → contributions → net), minimum wage, dual-education pipeline.

**Sources:**
- INS Tempo Online — employment, wages, sector
- ANOFM (anofm.ro) — unemployment, vacancies
- Eurostat LFS (`lfs_*`), Earnings (`earn_*`)
- ILOSTAT (ilostat.ilo.org)
- Ministerul Muncii (mmuncii.ro)
- ANAF (anaf.ro) — official tax rates & contribution schedules
- Salary surveys: PayScale, Glassdoor, salaryexplorer.com, payanalytics.ro
- LinkedIn Talent Insights (paid) / public LinkedIn member counts by city
- OECD Employment Database

---

## 10. Education & Talent Pipeline
*Pages 22–23 — vocational schools, dual programs, graduates/year, university programs, available seats per faculty.*

**Data points:** schools & universities (count, programs, capacity), graduates per year by field, dual-education partnerships, R&D output.

**Sources:**
- Ministerul Educației (edu.ro) — institutional registry, capacity
- ARACIS (aracis.ro) — accredited programs
- UEFISCDI (uefiscdi.ro) — university data, R&D
- Individual university sites (UTCN, UBB, USAMV, UMF Cluj)
- ETER (European Tertiary Education Register)
- Eurostat Education (`educ_*`)
- OpenAlex — academic publications & researchers per institution
- ORCID, OpenAIRE — researcher/output graphs

---

## 11. Existing Business Ecosystem
*Page 24 — De'Longhi, Endava, Emerson, Bosch with employee counts and sectors.*

**Data points:** major employers, employee counts, sector, foreign vs domestic capital, startup & R&D ecosystem, clusters.

**Sources:**
- ONRC (onrc.ro) — official trade registry
- listafirme.ro, termene.ro, risco.ro — usable mirrors with financials
- Crunchbase — startup/funding data
- Dealroom.co — European startup ecosystem
- PitchBook (paid)
- LinkedIn Company pages — employee counts
- CORDIS (cordis.europa.eu) — EU R&D project beneficiaries
- PatentsView, EPO Espacenet, WIPO PATENTSCOPE — patent activity
- Romanian Industry Clusters (clustero.eu)

---

## 12. Innovation, Research & Startup Ecosystem
*Implied by challenge brief; supports the "innovation district" narrative.*

**Data points:** R&D spend (% GDP), researchers per 1k workers, patents per capita, EU R&I project participation, startups & funding, scientific publications.

**Sources:**
- Global Innovation Index (WIPO)
- European Innovation Scoreboard (DG R&I)
- Regional Innovation Scoreboard (NUTS2)
- CORDIS (EU framework programs: H2020, Horizon Europe)
- OpenAlex — publications, citations, author affiliations
- PatentsView, EPO PATSTAT, Espacenet
- Crunchbase, Dealroom, Tracxn — startups & VC
- GitHub developer concentration (commits geo-tagged via GHTorrent)

---

## 13. Environment, Sustainability & Climate Risk
*Implicit (photovoltaic park, CO₂ forecast on p. 10) and central to the challenge brief.*

**Data points:** air quality (PM2.5, NO₂), water stress, flood/drought risk, land cover, renewable potential (solar/wind), CO₂ intensity, protected areas.

**Sources:**
- Copernicus (CAMS air, CLMS land, CEMS emergency, C3S climate, Sentinel imagery)
- European Environment Agency (eea.europa.eu)
- ANPM (anpm.ro) — Romanian environmental agency
- Global Solar Atlas, Global Wind Atlas (ESMAP / DTU)
- ENTSO-E for grid mix
- World Resources Institute — Aqueduct (water risk)
- Climate-ADAPT (EU adaptation portal)

---

## 14. Tax, Incentives & State Aid
*Pages 25–29 — corporate tax, VAT, local exemptions, hiring subsidies, state-aid schemes table (GD 300/2024, ConstructPlus, GD 959/2022, InvestAlim, etc.), CEE tax comparison.*

**Data points:** corporate income tax, VAT, local tax rates, hiring subsidies (€/month per category), active state-aid schemes (budget, intensity, eligibility), cross-country comparison.

**Sources:**
- Ministerul Finanțelor (mfinante.gov.ro) — Fiscal Code, GD (Hotărâri de Guvern)
- ANAF (anaf.ro)
- Consiliul Concurenței (consiliulconcurentei.ro) — state-aid registry
- European Commission — State Aid Scoreboard (TAM database)
- InvestRomania (investromania.gov.ro) — investor incentives portal
- PwC / KPMG / Deloitte / EY annual tax summaries (PDF scrape)
- OECD Tax Database (tax-policy / corporate-tax-stats)
- IBFD Tax Research Platform (paid)
- Monitorul Oficial (monitoruloficial.ro) — laws & GDs full-text

---

## 15. Mobility & Connectivity (Digital Infrastructure)
*Implicit — "IT hub", but not detailed in this PDF. Common investor ask.*

**Data points:** broadband coverage & speed, 5G coverage, fixed/mobile penetration, fiber availability, data center proximity.

**Sources:**
- ANCOM (ancom.ro / netograf.ro) — Romanian telecom regulator
- nPerf, Ookla Speedtest open data
- European Commission DESI (Digital Economy and Society Index)
- OpenSignal / Cloudflare Radar
- DataCenterMap.com / Cushman & Wakefield data center reports

---

## Quick-Start Coverage Matrix

| Category | Primary Open Source | Romania-Specific | Coverage |
|---|---|---|---|
| 1. Location | OpenStreetMap + ORS | CNAIR, CFR | ★★★★★ |
| 2. Economy | Eurostat, World Bank | INS, BNR, ONRC | ★★★★★ |
| 3. Quality of Life | EC Urban Audit | — | ★★★★ |
| 4. Demographics | Eurostat, GHS-POP | INS | ★★★★★ |
| 5. Land/Real Estate | INSPIRE | ANCPI, Imobiliare.ro | ★★★ |
| 6. Transport | OSM, TEN-T | CNAIR, SEAP | ★★★★ |
| 7. Utilities | ENTSO-E | ANRE, Transelectrica | ★★★ |
| 8. Health | Eurostat, WHO | MS, CNAS | ★★★★ |
| 9. Labor | Eurostat LFS | INS, ANOFM | ★★★★★ |
| 10. Education | OpenAlex, Eurostat | edu.ro, ARACIS | ★★★★ |
| 11. Business Ecosystem | Crunchbase, CORDIS | ONRC, listafirme | ★★★★ |
| 12. Innovation | EIS, CORDIS, OpenAlex | UEFISCDI | ★★★★ |
| 13. Environment | Copernicus, EEA | ANPM | ★★★★★ |
| 14. Tax/Incentives | EC State Aid | MFP, ANAF, InvestRomania | ★★★★ |
| 15. Digital Infra | DESI | ANCOM | ★★★ |
