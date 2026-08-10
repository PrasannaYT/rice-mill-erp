# FEATURE REQUEST: Predictive Sourcing CRM (Procurement Hub)

## Overview
We are integrating a predictive machine learning model into the Procurement Hub. The model predicts which farmers are likely to harvest specific paddy varieties in the current month. We need a new UI view to display these leads as a simple, actionable calling list for the procurement team.

Please implement the following UI updates based on the existing Procurement Hub design language.

## 1. Top Navigation Update
**Issue:** The current top navigation has two tabs (`PADDY INBOUND` and `PACKAGING INBOUND`). 
**Action:** Add a third tab to this group called `SMART FORECAST` (or `PREDICTIVE LEADS`).
- If space is tight, make this pill-container horizontally scrollable (`flex overflow-x-auto hide-scrollbar`).
- **Active State:** Solid golden background (`#F5A623`) with black text, matching the current active state.

## 2. The "Smart Forecast" View (Dynamic Rendering)
When the user selects the `SMART FORECAST` tab, hide the "Truck Queue" and "New Weighbridge Entry" forms. Replace the content area with the predictive CRM list.

- **Header:** Add a clean title at the top of the list: `Expected Harvests: August 2026` (make the month dynamic based on current date).

## 3. The Predictive Lead Cards (The UI Component)
Generate a vertical list of cards for each predicted farmer. Use the standard dark card style (`bg-[#1a1a1a]`, rounded corners, subtle borders).

**Card Anatomy:**
- **Top Row (Header):** 
  - Left: `Farmer Name` (e.g., **Ramanathan** - Bold, white text).
  - Right: `Confidence Score` (e.g., `🟢 88% Probability` - Small text, use green/yellow/red dots based on percentage).
- **Middle Row (Data):** 
  - `Expected Variety:` (e.g., BPT, RNR).
  - `Est. Historical Yield:` (e.g., ~15,000 kg).
- **Bottom Row (Action):**
  - A full-width or prominent **"Click to Call"** button.

## 4. "Click to Call" Implementation (Strict Requirement)
The user explicitly requested that "Click to Call" is the only required action. 
- Use the native HTML `tel:` protocol for the button link.
- **Code Example:** 
  `<a href="tel:+919876543210" class="flex items-center justify-center w-full py-3 mt-3 bg-[#F5A623] text-black font-bold rounded-lg gap-2">`
  `<PhoneIcon size={18} /> CALL FARMER`
  `</a>`
- This ensures that tapping the button on a mobile device instantly opens the phone's native dialer with the farmer's number pre-filled.

## 5. API / Data Structure Expectation
For the frontend mocking, assume the API (built with FastAPI/Python) will return a JSON array structured like this:
```json
[
  {
    "farmer_id": "F-102",
    "name": "Suresh Kumar",
    "phone": "+919876543210",
    "predicted_variety": "BPT",
    "probability_score": 0.92,
    "historical_avg_kg": 12500
  }
]

---

# Backend Integration Plan: Predictive Sourcing CRM

## Overview
We need to integrate the predictive machine learning model outputs into the Procurement Hub dashboard. The model (presumably a Python-based service) analyzes historical data to forecast which farmers will likely harvest specific paddy varieties in the current month. This new functionality will be accessible via a new "Smart Forecast" tab in the Procurement Hub.

## 1. API Contract (FastAPI)
I will expose a new endpoint under the Procurement Hub namespace (or a new `sourcing` namespace).

- **Endpoint:** `GET /api/v1/sourcing/predictive-leads`
- **Authentication:** Requires valid user session token.
- **Response (JSON):**
  ```json
  {
    "current_month": "August 2026",
    "leads": [
      {
        "farmer_id": "F-102",
        "name": "Suresh Kumar",
        "phone": "+919876543210",
        "predicted_variety": "BPT",
        "probability_score": 0.92,
        "confidence_level": "HIGH", // Mapping from score: >0.85=HIGH, >0.6=MEDIUM, <0.6=LOW
        "historical_avg_kg": 12500,
        "last_contact_date": null
      }
    ]
  }
  ```

## 2. Data Flow & Logic
1.  **Trigger:** The user clicks the new "Smart Forecast" tab in the UI.
2.  **Backend Execution:**
    - The FastAPI endpoint calculates the current month (e.g., August).
    - It queries the existing ML model (or runs a saved model pipeline) using historical data for all registered farmers.
    - **Crucial:** The backend must handle the potential latency of the model inference. If the model is heavy, consider running it asynchronously via Celery/Redis and returning a cached result, or simply accepting that this tab might take 1-2 seconds to load the first time.
3.  **Response:** Returns the structured JSON with the list of predicted leads.

## 3. Technical Implementation Notes
- **ML Model Location:** Assuming the Python ML model script/service is located at `src/ml/predictive_sourcing_model.py`. We will import the prediction logic from there.
- **Database Interaction:** We will likely need to join farmer profiles with the `paddy_history` table to get `last_contact_date` if we want to implement "do not contact" logic, or simply rely on the model's output for now.
- **Error Handling:** If the ML model fails to run (e.g., missing dependencies), the API should return an empty list with a helpful error message in the console, not crash the server.

## 4. Immediate Next Step
**Create the endpoint:** I will first implement the FastAPI endpoint and mock the data locally to ensure the UI can consume it immediately.
