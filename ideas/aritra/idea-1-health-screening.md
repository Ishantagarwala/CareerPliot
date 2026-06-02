# 🩺 Idea 1: AI-Powered Rural Health Screening Assistant

## Detailed Architecture & Project Life-Cycle

**Author:** Aritra  
**Hackathon:** Brainware AI Hackathon 2026  
**Last Updated:** June 2, 2026

---

## 1. Problem Statement

In rural and semi-urban India, access to specialist doctors is extremely limited. There is roughly **1 doctor per 10,000+ people** in rural areas. Preventable diseases — skin conditions, eye diseases, respiratory illnesses — go undiagnosed because patients cannot afford or travel to urban hospitals for early screening. ASHA workers (Accredited Social Health Activists), who form the backbone of rural healthcare delivery, lack any technological aid for preliminary diagnosis.

---

## 2. Proposed Solution

A **mobile-first AI health screening application** that empowers ASHA workers, local pharmacists, and even patients themselves to perform preliminary health screenings using a smartphone camera and a guided symptom questionnaire. The app produces a structured referral report that patients can carry to a hospital.

---

## 3. System Architecture

### 3.1 High-Level Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                        USER LAYER (Mobile App)                      │
│                                                                     │
│  ┌──────────┐  ┌──────────────┐  ┌────────────┐  ┌──────────────┐  │
│  │  Camera   │  │  Symptom     │  │  Voice     │  │  Report      │  │
│  │  Module   │  │  Chatbot UI  │  │  I/O       │  │  Viewer      │  │
│  └─────┬────┘  └──────┬───────┘  └─────┬──────┘  └──────┬───────┘  │
│        │               │               │                │           │
└────────┼───────────────┼───────────────┼────────────────┼───────────┘
         │               │               │                │
         ▼               ▼               ▼                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     ON-DEVICE AI LAYER (Edge)                       │
│                                                                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────────┐  │
│  │  TFLite /    │  │  Whisper     │  │  Offline Symptom         │  │
│  │  Skin CNN    │  │  Tiny (STT)  │  │  Decision Tree           │  │
│  │  (Classifier)│  │              │  │  (Rule-based fallback)   │  │
│  └──────┬───────┘  └──────┬───────┘  └────────────┬─────────────┘  │
│         │                 │                        │                │
└─────────┼─────────────────┼────────────────────────┼────────────────┘
          │                 │                        │
          ▼                 ▼                        ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      BACKEND API LAYER (Cloud)                      │
│                                                                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────────┐  │
│  │  FastAPI      │  │  LLM Service │  │  Report Generation       │  │
│  │  Gateway      │  │  (Chatbot)   │  │  Service                 │  │
│  └──────┬───────┘  └──────┬───────┘  └────────────┬─────────────┘  │
│         │                 │                        │                │
└─────────┼─────────────────┼────────────────────────┼────────────────┘
          │                 │                        │
          ▼                 ▼                        ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        DATA & STORAGE LAYER                         │
│                                                                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────────┐  │
│  │  Firebase /   │  │  Model       │  │  Screening History       │  │
│  │  Supabase     │  │  Registry    │  │  (Anonymized)            │  │
│  │  (Auth + DB)  │  │  (MLflow)    │  │                          │  │
│  └──────────────┘  └──────────────┘  └──────────────────────────┘  │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 3.2 Component Breakdown

| Component | Responsibility | Technology |
|:---|:---|:---|
| **Mobile App** | Camera capture, chatbot UI, voice I/O, offline mode | React Native / Flutter |
| **Skin Classifier** | Classify skin conditions from camera images | TensorFlow Lite (MobileNetV3 fine-tuned on HAM10000) |
| **Symptom Chatbot** | Guided symptom assessment, follow-up questions | Cloud: Gemma/Phi via LangChain · Offline: Rule-based decision tree |
| **Speech Module** | Bengali/Hindi/English voice input/output | Google Speech-to-Text + TTS / Whisper Tiny (offline) |
| **Report Generator** | Structured PDF with findings + referral recommendation | ReportLab (Python) / jsPDF (client-side) |
| **API Gateway** | Request routing, auth, rate limiting | FastAPI + Uvicorn |
| **Database** | User auth, screening records, analytics | Firebase Auth + Firestore / Supabase |
| **Model Registry** | Model versioning, A/B testing | MLflow (optional for hackathon) |

---

## 4. Project Life-Cycle

### Phase 1: Research & Data Collection (Week 1 — June 2–8)

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  Collect &    │────▶│  Exploratory  │────▶│  Define MVP  │
│  Study        │     │  Data         │     │  Scope &     │
│  Datasets     │     │  Analysis     │     │  Milestones  │
└──────────────┘     └──────────────┘     └──────────────┘
```

**Tasks:**
- [ ] Download and study HAM10000 dataset (10,015 dermoscopic images, 7 disease classes)
- [ ] Research additional datasets: ISIC Archive, DermNet
- [ ] Study ASHA worker workflows — what does a typical screening look like?
- [ ] Define the symptom decision tree (top 20 most common rural conditions)
- [ ] Finalize MVP scope and feature prioritization

**Deliverables:**
- Dataset exploration notebook
- Symptom decision tree draft (JSON/YAML)
- MVP requirements document

---

### Phase 2: Model Training & Core AI (Week 2 — June 9–15)

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  Data         │────▶│  Train &     │────▶│  Convert to  │
│  Preprocessing│     │  Validate    │     │  TFLite /    │
│  & Augment    │     │  CNN Model   │     │  ONNX        │
└──────────────┘     └──────────────┘     └──────────────┘
```

**Tasks:**
- [ ] Preprocess images: resize (224×224), normalize, augment (rotation, flip, color jitter)
- [ ] Train MobileNetV3 (transfer learning) — freeze base, train head
- [ ] Validate with stratified K-fold (target: >85% accuracy on 5 classes)
- [ ] Convert trained model to TensorFlow Lite for mobile deployment
- [ ] Build and test symptom chatbot pipeline with LangChain + Gemma API
- [ ] Create fallback rule-based decision tree for offline use

**Deliverables:**
- Trained skin classifier model (.tflite, ~5-10MB)
- Chatbot prototype (CLI-based, tested with 20+ symptom scenarios)
- Model evaluation report (accuracy, precision, recall, confusion matrix)

---

### Phase 3: App Development & Integration (Week 3 — June 16–22)

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  Build Mobile │────▶│  Integrate   │────▶│  Build       │
│  UI Screens   │     │  AI Models   │     │  Backend     │
│              │     │  + Voice I/O │     │  API         │
└──────────────┘     └──────────────┘     └──────────────┘
          │                                       │
          ▼                                       ▼
┌──────────────┐                         ┌──────────────┐
│  Report PDF  │                         │  Submit      │
│  Generation  │                         │  Proposal    │
└──────────────┘                         └──────────────┘
```

**Tasks:**
- [ ] Build mobile app screens: Home → Camera → Results → Chatbot → Report
- [ ] Integrate TFLite model for real-time camera inference
- [ ] Integrate speech-to-text for Bengali/Hindi voice input
- [ ] Build FastAPI backend: `/predict`, `/chat`, `/report` endpoints
- [ ] Implement PDF report generation with findings + risk score
- [ ] Deploy backend to a free tier (Railway / Render / Google Cloud Run)
- [ ] **Submit hackathon proposal by June 22**

**Deliverables:**
- Working mobile/web app prototype
- Deployed backend API
- Hackathon proposal submission

---

### Phase 4: Prototype Refinement (July — Screening Phase)

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  User Testing │────▶│  Bug Fixes & │────▶│  Performance │
│  with Peers   │     │  UI Polish   │     │  Optimization│
└──────────────┘     └──────────────┘     └──────────────┘
```

**Tasks:**
- [ ] Conduct user testing with 5-10 peers (simulate ASHA worker usage)
- [ ] Improve model accuracy based on failure cases
- [ ] Add offline mode (cache models, queue reports for sync)
- [ ] Polish UI/UX for demo readiness
- [ ] Prepare demo script and slides

---

### Phase 5: Final Presentation (August)

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  Prepare Demo │────▶│  Practice    │────▶│  Present to  │
│  Video &      │     │  Pitch (5min)│     │  Expert      │
│  Slides       │     │              │     │  Panel       │
└──────────────┘     └──────────────┘     └──────────────┘
```

---

## 5. Data Flow Diagram

```
User opens app
       │
       ▼
┌─────────────────┐
│ Choose Screening │
│ Type             │
├─────────┬───────┤
│  Skin   │ Sympt.│
│  Scan   │ Check │
└────┬────┴───┬───┘
     │        │
     ▼        ▼
┌─────────┐ ┌──────────────┐
│ Capture │ │ Voice/Text   │
│ Image   │ │ Symptom      │
│ (Camera)│ │ Input        │
└────┬────┘ └──────┬───────┘
     │             │
     ▼             ▼
┌─────────┐ ┌──────────────┐
│ On-device│ │ LLM/Rule     │
│ CNN      │ │ Engine       │
│ Inference│ │ Processing   │
└────┬────┘ └──────┬───────┘
     │             │
     └──────┬──────┘
            │
            ▼
   ┌─────────────────┐
   │ Risk Assessment  │
   │ Score (0-100)    │
   └────────┬────────┘
            │
            ▼
   ┌─────────────────┐
   │ Generate PDF     │
   │ Referral Report  │
   └────────┬────────┘
            │
            ▼
   ┌─────────────────┐
   │ Save to History  │
   │ + Share/Print    │
   └─────────────────┘
```

---

## 6. MVP Definition (Minimum Viable Product)

> **Goal:** A working demo that can be shown in under 5 minutes to judges, demonstrating real AI inference on a real input.

### 6.1 MVP Feature Set

| Feature | In MVP? | Details |
|:---|:---:|:---|
| Skin condition classifier (camera) | ✅ | Classify 5 conditions: Eczema, Fungal Infection, Psoriasis, Melanocytic Nevi, Benign Keratosis |
| Symptom chatbot (text) | ✅ | Text-based chatbot with 10 common conditions (fever, cough, skin rash, stomach pain, etc.) |
| Bengali voice input | ✅ | Google Speech-to-Text API for Bengali input → translated to English for processing |
| PDF report generation | ✅ | Single-page PDF with: patient info, condition detected, confidence %, risk level, referral suggestion |
| Offline mode | ❌ | Deferred to Phase 4 |
| Patient history tracking | ❌ | Deferred — use anonymous sessions for MVP |
| Multi-disease screening (eye, dental) | ❌ | Future scope |
| ASHA worker dashboard | ❌ | Future scope |

### 6.2 MVP User Journey

```
┌───────────────────────────────────────────────────────────────────┐
│                        MVP DEMO FLOW                             │
│                                                                   │
│  Step 1          Step 2           Step 3          Step 4          │
│  ┌─────────┐    ┌─────────────┐  ┌────────────┐  ┌────────────┐ │
│  │ Open App │───▶│ Take Photo  │─▶│ See Result │─▶│ Download   │ │
│  │ & Select │    │ of Skin     │  │ + Risk     │  │ PDF Report │ │
│  │ "Skin    │    │ Condition   │  │ Score      │  │            │ │
│  │  Scan"   │    │             │  │            │  │            │ │
│  └─────────┘    └─────────────┘  └────────────┘  └────────────┘ │
│                                                                   │
│  Alt. Flow:                                                       │
│  ┌─────────┐    ┌─────────────┐  ┌────────────┐  ┌────────────┐ │
│  │ Open App │───▶│ Speak/Type  │─▶│ Bot asks   │─▶│ Risk Score │ │
│  │ & Select │    │ Symptoms in │  │ follow-up  │  │ + Referral │ │
│  │ "Symptom │    │ Bengali     │  │ questions  │  │ Report     │ │
│  │  Check"  │    │             │  │            │  │            │ │
│  └─────────┘    └─────────────┘  └────────────┘  └────────────┘ │
│                                                                   │
└───────────────────────────────────────────────────────────────────┘
```

### 6.3 MVP Tech Stack (Simplified)

| Layer | MVP Choice | Why |
|:---|:---|:---|
| **Frontend** | **React (Web App)** | Faster to build than native mobile for a hackathon; works on any device |
| **Skin AI Model** | **MobileNetV3 fine-tuned on HAM10000 → TF.js** | Runs in-browser, no backend needed for inference |
| **Chatbot** | **Google Gemini API via LangChain** | Free tier available, handles Bengali, minimal setup |
| **Voice** | **Web Speech API (browser-native)** | Zero setup, works in Chrome, supports Hindi |
| **PDF** | **jsPDF (client-side)** | No backend dependency, generates PDF in browser |
| **Backend** | **FastAPI (minimal)** | Only for chatbot proxy if needed; can be skipped if using client-side Gemini |
| **Hosting** | **Vercel (frontend) + Render (backend)** | Free tiers, fast deploy |

### 6.4 MVP File/Folder Structure

```
health-screening-app/
├── public/
│   └── index.html
├── src/
│   ├── App.jsx                  # Main app with routing
│   ├── index.js                 # Entry point
│   ├── components/
│   │   ├── Header.jsx           # App header with navigation
│   │   ├── CameraCapture.jsx    # Camera access & photo capture
│   │   ├── SkinResult.jsx       # Display classification result + confidence
│   │   ├── SymptomChat.jsx      # Chatbot interface
│   │   └── ReportGenerator.jsx  # PDF report builder
│   ├── models/
│   │   └── skin_classifier.tflite  # Converted TFLite model
│   ├── utils/
│   │   ├── loadModel.js         # TF.js model loader
│   │   ├── classifyImage.js     # Run inference on captured image
│   │   ├── chatService.js       # Gemini API chatbot calls
│   │   └── generatePDF.js       # jsPDF report generator
│   └── data/
│       └── symptom_tree.json    # Fallback decision tree data
├── backend/                     # Optional FastAPI backend
│   ├── main.py                  # API endpoints
│   ├── chat.py                  # Chatbot logic
│   └── requirements.txt
├── notebooks/
│   ├── data_exploration.ipynb   # Dataset EDA
│   └── model_training.ipynb     # Training pipeline
├── package.json
└── README.md
```

### 6.5 MVP API Endpoints (Backend — if used)

| Method | Endpoint | Description | Input | Output |
|:---|:---|:---|:---|:---|
| POST | `/api/chat` | Send symptom message, get chatbot reply | `{ "message": "...", "language": "bn" }` | `{ "reply": "...", "follow_up": true }` |
| POST | `/api/chat/summary` | Get final risk assessment from chat | `{ "session_id": "..." }` | `{ "risk_score": 72, "conditions": [...], "referral": "Dermatologist" }` |
| GET | `/api/health` | Health check | — | `{ "status": "ok" }` |

> **Note:** Skin classification runs entirely on-device (TF.js in browser) — no API call needed.

### 6.6 MVP Timeline (3 Weeks)

```
Week 1 (June 2-8)          Week 2 (June 9-15)         Week 3 (June 16-22)
┌────────────────────┐     ┌────────────────────┐     ┌────────────────────┐
│ • Dataset download │     │ • Train CNN model  │     │ • Build React UI   │
│ • Data exploration │     │ • Convert to TF.js │     │ • Integrate model  │
│ • Symptom tree     │     │ • Chatbot pipeline │     │ • Voice input      │
│   design           │     │ • Test chatbot     │     │ • PDF generation   │
│ • Wireframe UI     │     │   with Bengali     │     │ • Deploy & test    │
│ • Setup project    │     │ • Backend API      │     │ • Submit proposal  │
└────────────────────┘     └────────────────────┘     └────────────────────┘
```

---

## 7. Risk Assessment & Mitigation

| Risk | Impact | Mitigation |
|:---|:---|:---|
| Low model accuracy on real-world phone photos | High | Train with augmented data (varying lighting, angles); add "Low confidence — please retake" UX |
| Bengali speech recognition poor quality | Medium | Fallback to text input; use Google API which has strong Bengali support |
| Ethical concerns (AI giving medical advice) | High | Always display disclaimer: "This is a screening tool, not a diagnosis. Please consult a doctor." |
| No internet in rural areas | Medium | Bundle TF.js model in app; defer chatbot to offline decision tree |
| Scope creep (too many features) | High | Strict MVP — only 5 skin conditions + basic chatbot for hackathon |

---

## 8. Future Scope (Post-Hackathon)

- **Diabetic retinopathy screening** from fundus camera images
- **Malaria parasite detection** from blood smear microscope photos
- **Integration with government health portals** (NHA, ABHA)
- **Offline-first PWA** for areas with no connectivity
- **ASHA worker dashboard** with patient tracking and follow-up reminders
- **Federated learning** to improve models without sharing patient data

---

*This document serves as the complete architectural blueprint for Idea 1. Refer to the [main ideas summary](./ideas.md) for comparison with other proposals.*
