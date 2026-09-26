# Project Light 19 — Cold-Chain Food AI

A frontend-only international cold-chain decision prototype built for CMUQ Qatar. Simulated sensor and flight streams feed a pure TypeScript shelf-life and route-economics engine; route recommendations follow freshness (raw can travel farther, edible stays regional, near-expiry stays local, and expired lots follow safe recovery tiers). Operators can approve recommendations for simulation only; no real shipment or partner action is triggered.

## Run locally

```bash
npm install
npm run dev
```

Then open:

```text
http://localhost:5173
```

## Checks

```bash
npm test
npm run build
```

## What is modeled

- Live batch streams for temperature, humidity, GPS and speed, ethylene, cumulative time out of range, route heat, traffic ETA, destination demand, vision quality, and spoilage gas.
- International origin and destination lanes with an illustrative air-cargo timetable, flight numbers, carrier, airport codes, local departure/arrival times, duration, cargo capacity, and simulated scheduled/boarding/transit/arrival states. Flights remain scheduled until the operator confirms dispatch. Flight data is demonstration data, not a live airline feed.
- Pure calculation/routing logic under `src/engine`, discrete simulated streams under `src/sensors`, and page components under `src/pages`.
- Temperature, ethylene, and traffic fault injection in the Anomaly Lab; each updates batch state and creates auditable anomaly/recommendation events.
- Four produce stages, stage-aware destinations, positive-value financial checks, and safe expired-food recovery ordering. Landfill is reserved for unsafe or contaminated lots.
- Manual intake starts with a food group (fruit, vegetable, meat, poultry, seafood, dairy, or other chilled food), then offers only profiles in that group. Reference profiles can be added with shelf-life, safe-temperature, ethylene, route-speed, and value assumptions; saved profiles are available for later lot assessments in the same browser.
- Operators can approve a suggested route, choose a different destination within the modeled safe travel range, or hold a lot for inspection and record a note. Choices appear in the local activity log; they do not trigger real shipments.
- The home page links directly to the full recent-activity view and summarizes estimated net recovery value and potential food kept in use from current lot data.
- A concise priority queue puts operator decisions first, with full inventory and technical route tools kept separate.
- Simulated telemetry charts identify axes and product temperature, humidity, and ethylene limits. Each lot summary shows current evidence, safe limits, estimated freshness, arrival likelihood, and modeled recovery value before expandable sensor, traceability, and activity details.
- The prototype labels modeled values as illustrative, displays update/offline/storage status, and records a typed operator display name for simulated approvals. That name is not verified; approvals and activity history are saved only in the current browser and are not an immutable or shared audit record.
- Seeded traceability covers 16 produce lots from 12 origin markets with supplier lot codes, packing dates, pallet counts, cold-store readings, and destination partners. All market, carrier, flight, and sensor values are simulated sample data for demonstration; connect validated operator feeds before making real dispatch decisions.
- A batch picker is available from every tab. Select any item in the overview, route map, flight board, workflow, inspector, or reference data to open its traceability, sensor history, reasoning, scheduled routine, audit trail, fault controls, and operator dispatch confirmation.
- Predictions learns route- and food-group-specific temperature rises from completed simulated flights, saves the observations in this browser, and offers a bounded pre-cooling setpoint for operator review. Applying it changes only the local demo lot; it is not a refrigeration control. Sensor settings shows simulated signal issues and lets an operator compare displayed values with a trusted external reference, but it does not claim device accuracy or calibrate hardware.
- The demo starts with 16 illustrative sample lots and adds a clearly labeled simulated arrival every five minutes while the app is open; operators can add one immediately from Manual intake. It retains at most 24 generated arrivals alongside the original samples and operator-entered lots. Auto-generated records are not shipments, observations from real sensors, or calibration evidence.
- The streamlined interface includes lot search, camera-based QR lookup, action-needed notifications, and manual lot intake with validation and a recommendation preview before adding it to the sample inventory.
- Dark and light themes can be toggled from the header; the choice is saved in browser storage.

This is a prototype decision layer, not a substitute for a logistics or inventory platform. It is designed to integrate with existing systems and use fewer required physical sensors; most signals can be simulated or supplied by existing operational data. No backend, database, authentication, or external sensor connection is required. It does not make real dispatches; validate all recommendations using operator procedures and real food-safety data before any operational use.

## Data sources and attribution

The live public integrations are deliberately limited to sources that match the data being shown. Network requests time out and use browser-local cached values where available; the existing sample value is shown with a “Sample fallback” label if no cache exists. Live weather is outdoor context, not a reading from inside a shipment.

| Source | Use in this prototype | Access / limits | License and attribution |
| --- | --- | --- | --- |
| [Open-Meteo](https://open-meteo.com/) | Current outdoor temperature and humidity at the selected lot's displayed coordinate on Route map; the coordinate can itself be sample data. This is not cargo-sensor telemetry. | No API key. Free API is for non-commercial use and allows fewer than 10,000 calls/day, 5,000/hour, and 600/minute. | Data are CC BY 4.0. Credit Open-Meteo, link the license, and indicate changes. See [license](https://open-meteo.com/en/licence) and [terms](https://open-meteo.com/en/terms). |
| [OSRM](https://project-osrm.org/) + [OpenStreetMap](https://www.openstreetmap.org/copyright) | On-demand road distance and estimated duration for lots whose proposed route is by road. OSRM does not supply live traffic and is not used for air or sea legs. | No API key. The public OSRM demo is best-effort with no SLA; its documentation does not specify a numeric request quota. Do not treat the public demo as a production dependency. | OSM data are ODbL. Display “© OpenStreetMap contributors” and link the [copyright/license page](https://www.openstreetmap.org/copyright). |
| [NASA POWER](https://power.larc.nasa.gov/docs/services/api/) | Documented as a possible historical/regional climate reference; it is not currently queried by the app and is not a live shipment-weather feed. | API examples do not require a key. Avoid excessive synchronous requests; NASA may block abusive usage and can return HTTP 429. No fixed numeric quota is published in the cited documentation. | Credit NASA POWER and check the metadata/license conditions for the exact product used; do not imply NASA endorsement. |
| [EPA Wasted Food Scale](https://www.epa.gov/sustainable-management-food/wasted-food-scale) | Guidance for explaining recovery options. The legacy [Food Recovery Hierarchy URL](https://www.epa.gov/sustainable-management-food/food-recovery-hierarchy) redirects to the updated scale. | Static guidance page; no API key or API rate limit. | Cite EPA and link the guidance. U.S. federal material is generally public domain unless a page identifies third-party material; verify any reused third-party content. |
| [FAO Food Loss and Waste Database](https://www.fao.org/platform-food-loss-waste/flw-data/en) | Candidate for carefully selected country/commodity benchmark context. It is not queried by this app and does not measure this prototype’s saved food or local cold-chain performance. | Query/download is available on the database site; no stable public API contract, key requirement, or request quota is documented for this database. | FAO corporate statistical datasets are generally CC BY 4.0 unless metadata says otherwise, but the FLW collection aggregates third-party studies that may have separate terms. Verify each record before reuse; cite FAO and follow the [database terms](https://www.fao.org/contact-us/terms/db-terms-of-use/en/). |
| [Our World in Data](https://ourworldindata.org/faqs) | Candidate for a specific, cited global benchmark after an indicator is selected. The supplied [“Food Waste” URL](https://ourworldindata.org/food-waste) currently redirects to a general environmental-impacts-of-food page; no indicator from it is currently used. | Chart data are available through CSV/JSON URLs without an API key. No fixed numeric rate limit is published in the cited guidance. | OWID-created material is CC BY 4.0, but many underlying datasets are third-party and retain their own licenses. Cite the indicator’s original data provider as well as OWID; see [reuse guidance](https://ourworldindata.org/faqs#can-i-reuse-or-republish-our-data). |

### Data that is still simulated or awaiting a suitable source

The supplied links do not provide real lot-level temperature/humidity sensor readings, GPS movement, ethylene, vision grading, spoilage gas, traffic, market demand/prices, or airline schedules and cargo capacity. These values and the sample lot inventory therefore remain explicitly illustrative; no unrelated API is substituted for them. Repeatedly generating sample lots can exercise the UI and route-learning code, but cannot improve real-world accuracy or sensor calibration. For that, connect actual device/operator feeds and collect independent reference measurements.

The linked FAO/OWID material is not a direct measurement of this app’s food saved, meals redirected, or emissions avoided. Current shelf-life profiles, safe ranges, the shelf-life engine, and impact calculations have not been changed. Do not interpret the demo’s estimated impact as measured or causal.

The other screenshots show open-source software, humanitarian platforms, development tools, and an operating-system usage graphic rather than food/cold-chain datasets. OpenStreetMap is the relevant exception for road-network data; the other pictured projects are not integrated.

No API keys are required by the integrations currently enabled. See [`.env.example`](.env.example). Never put a private provider key in a `VITE_` variable: Vite embeds those values in the public browser bundle.
