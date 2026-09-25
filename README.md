# Reboot the Earth — Cold-Chain Food AI

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
- A concise priority queue puts operator decisions first, with full inventory and technical route tools kept separate.
- Simulated telemetry charts identify axes and product temperature, humidity, and ethylene limits. Each lot summary shows current evidence, safe limits, estimated freshness, arrival likelihood, and modeled recovery value before expandable sensor, traceability, and activity details.
- The prototype labels modeled values as illustrative, displays update/offline/storage status, and records a typed operator display name for simulated approvals. That name is not verified; approvals and activity history are saved only in the current browser and are not an immutable or shared audit record.
- Seeded traceability covers 16 produce lots from 12 origin markets with supplier lot codes, packing dates, pallet counts, cold-store readings, and destination partners. All market, carrier, flight, and sensor values are simulated sample data for demonstration; connect validated operator feeds before making real dispatch decisions.
- A batch picker is available from every tab. Select any item in the overview, route map, flight board, workflow, inspector, or reference data to open its traceability, sensor history, reasoning, scheduled routine, audit trail, fault controls, and operator dispatch confirmation.
- The streamlined interface includes lot search, camera-based QR lookup, action-needed notifications, and manual lot intake with validation and a recommendation preview before adding it to the sample inventory.
- Dark and light themes can be toggled from the header; the choice is saved in browser storage.

This is a prototype decision layer, not a substitute for a logistics or inventory platform. It is designed to integrate with existing systems and use fewer required physical sensors; most signals can be simulated or supplied by existing operational data. No backend, database, authentication, or external sensor connection is required. It does not make real dispatches; validate all recommendations using operator procedures and real food-safety data before any operational use.
