# CivicResolve — Maharashtra Municipal Platform Credentials

This document outlines the official test and demonstration administrative credentials for Maharashtra State Administration and all 36 Districts & Municipal Corporations.

---

## Global Demo Password

For development/testing environments without configured Supabase Auth accounts:
- **Default Password:** `demo@2026`

---

## 1. Maharashtra State Administration

| Level | Login ID | Email | Jurisdiction |
| :--- | :--- | :--- | :--- |
| **State Admin** | `state_admin` | `state.admin@maharashtra.gov.in` | Statewide Multi-Corporation Oversight (36 Districts) |

---

## 2. District & Municipal Corporation Credentials

| District | Login ID | Default Corporation ID | Corporation / Authority | Division |
| :--- | :--- | :--- | :--- | :--- |
| **Pune** | `pune_admin` | `pmc` | Pune Municipal Corporation (PMC) | Pune |
| **Solapur** | `solapur_admin` | `smc` | Solapur Municipal Corporation (SMC) | Pune |
| **Mumbai** | `mumbai_admin` | `bmc` | Brihanmumbai Municipal Corporation (BMC) | Konkan |
| **Thane** | `thane_admin` | `tmc` | Thane Municipal Corporation (TMC) | Konkan |
| **Nashik** | `nashik_admin` | `nmc` | Nashik Municipal Corporation (NMC) | Nashik |
| **Nagpur** | `nagpur_admin` | `nmc_nagpur` | Nagpur Municipal Corporation (NMC) | Nagpur |
| **Chhatrapati Sambhajinagar** | `csn_admin` | `csmc` | CSMC Chhatrapati Sambhajinagar | Chhatrapati Sambhajinagar |
| **Kolhapur** | `kolhapur_admin` | `kmc` | Kolhapur Municipal Corporation (KMC) | Pune |
| **Amravati** | `amravati_admin` | `amc` | Amravati Municipal Corporation (AMC) | Amravati |

---

## Features & Isolation Verification

1. **State Administration (`state_admin`)**:
   - Access to statewide multi-district oversight cards.
   - Maharashtra-centered GIS map view.
   - Per-district drilldowns that seamlessly switch administrative context to selected corporations.

2. **District Logins (`pune_admin`, `solapur_admin`, etc.)**:
   - Automated geographic viewport re-centering to the district's municipal coordinates.
   - Strict data isolation without cross-district leakage.
   - Real-time district and corporation header badge rendering.
