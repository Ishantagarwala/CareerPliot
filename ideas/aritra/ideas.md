# 💡 Hackathon Idea Proposals — Aritra

**Hackathon:** Brainware AI Hackathon 2026  
**Proposal Deadline:** June 22, 2026  
**Theme:** Impactful AI-based solutions across diverse domains

---

## Idea 1: 🩺 AI-Powered Rural Health Screening Assistant

### Problem Statement

In rural and semi-urban India, access to specialist doctors is extremely limited. Many preventable diseases (skin conditions, eye diseases, respiratory issues) go undiagnosed because patients cannot travel to urban hospitals for early screening. According to government data, there is roughly 1 doctor per 10,000+ people in rural areas.

### Proposed Solution

A **mobile-first AI health screening app** that enables Community Health Workers (ASHAs) and local pharmacists to perform preliminary health screenings using just a smartphone camera and a simple questionnaire.

**Core AI Features:**
- **Skin Condition Classifier** — Uses a CNN (Convolutional Neural Network) trained on dermoscopic image datasets (e.g., HAM10000) to classify common skin conditions like fungal infections, eczema, psoriasis, and flag potentially cancerous moles.
- **Symptom-Based Triage Chatbot** — An NLP-powered chatbot (using a fine-tuned LLM or rule-based decision tree) that asks follow-up questions based on initial symptoms and generates a preliminary risk score.
- **Multilingual Support** — Voice input and output in Bengali, Hindi, and English using speech-to-text/text-to-speech APIs, making it accessible to non-literate users.
- **Referral Report Generation** — Automatically generates a structured PDF report with findings, risk level, and recommended specialist referral, which the patient can carry to a hospital.

### Tech Stack

| Component | Technology |
|:---|:---|
| Frontend | React Native / Flutter (mobile-first) |
| AI/ML Models | TensorFlow Lite / PyTorch Mobile (on-device inference) |
| NLP Chatbot | LangChain + fine-tuned small LLM (e.g., Gemma or Phi) |
| Speech | Google Speech-to-Text API / Whisper |
| Backend | FastAPI (Python) |
| Database | Firebase / Supabase |

### Why This Idea?

- **Real-life impact:** Directly addresses India's healthcare gap in rural areas.
- **Feasible for hackathon:** Skin classification models can be trained quickly on public datasets; chatbot can use existing LLM APIs.
- **Scalability:** Can be extended to eye screening (diabetic retinopathy), dental health, etc.
- **General public utility:** Millions of rural Indians + ASHA workers (1M+ nationwide) would benefit.

### Hackathon Deliverable (Prototype Scope)

- Working skin condition classifier from camera input (3-5 conditions)
- Basic symptom chatbot with Bengali/English support
- PDF report generation
- Simple demo app (web or mobile)

---

## Idea 2: 🚦 AI Traffic Signal Optimizer for Indian Cities

### Problem Statement

Indian cities like Kolkata face severe traffic congestion. Traditional traffic signals operate on fixed timers and don't adapt to actual traffic flow. This leads to:
- Wasted time at empty green signals
- Massive jams on overloaded roads
- Ambulances and emergency vehicles stuck in traffic
- Increased fuel wastage and pollution

### Proposed Solution

An **AI-powered adaptive traffic signal control system** that uses real-time video feeds from CCTV cameras (already installed at many intersections) to dynamically optimize signal timings.

**Core AI Features:**
- **Real-Time Vehicle Detection & Counting** — Uses YOLOv8/v9 object detection to count vehicles, classify types (car, bus, auto-rickshaw, bicycle, pedestrian), and estimate queue length from live CCTV feeds.
- **Adaptive Signal Timing Algorithm** — A reinforcement learning (RL) agent that learns optimal green-light durations based on real-time traffic density across multiple intersections in a corridor.
- **Emergency Vehicle Priority** — Detects ambulance/fire truck sirens (via audio classification) or visual markers and automatically prioritizes their lane with a green corridor.
- **Dashboard & Analytics** — Web dashboard showing live traffic heatmaps, average wait times, congestion predictions, and historical patterns for city traffic planners.

### Tech Stack

| Component | Technology |
|:---|:---|
| Object Detection | YOLOv8 / YOLOv9 (Ultralytics) |
| RL Agent | Stable-Baselines3 (PPO/DQN) with SUMO traffic simulator |
| Audio Classification | Custom CNN on siren audio datasets |
| Backend | FastAPI + WebSockets |
| Frontend Dashboard | React.js + D3.js / Chart.js |
| Simulation | SUMO (Simulation of Urban Mobility) |
| Database | PostgreSQL + TimescaleDB |

### Why This Idea?

- **Real-life impact:** Kolkata (and all Indian cities) desperately need smarter traffic management. This is a problem every citizen faces daily.
- **Feasible for hackathon:** SUMO simulator provides a realistic sandbox; YOLO models are pre-trained and can be fine-tuned quickly.
- **Government alignment:** Fits within India's Smart Cities Mission and existing CCTV infrastructure.
- **General public utility:** Reduces commute time, fuel costs, pollution, and saves lives via emergency priority.

### Hackathon Deliverable (Prototype Scope)

- YOLO-based vehicle detection on sample traffic video/CCTV footage
- RL agent trained in SUMO simulation for 1 intersection (with before/after comparison)
- Emergency vehicle detection demo
- Live web dashboard showing counts, signal timings, and analytics

---

## Idea 3: 📄 AI Document Fraud Detector for Everyday Citizens

### Problem Statement

Document fraud is rampant in India — fake certificates, forged signatures, tampered Aadhaar/PAN cards, doctored marksheets, and fraudulent property documents. Regular citizens, small businesses, landlords, and even educational institutions have no easy way to verify if a document is authentic. This leads to:
- Fraudulent property deals worth crores
- Fake degree holders getting jobs
- Identity theft via forged ID documents
- Loan fraud with doctored income certificates

### Proposed Solution

A **web/mobile app where anyone can upload a document and get an instant AI-generated authenticity report** — highlighting areas of potential tampering, checking for digital inconsistencies, and cross-referencing with known patterns.

**Core AI Features:**
- **Image Forensic Analysis** — Detects pixel-level tampering using Error Level Analysis (ELA), copy-move forgery detection (using keypoint matching), and metadata inconsistency checks (EXIF data analysis).
- **Font & Layout Anomaly Detection** — A trained model that knows what real government documents (Aadhaar, PAN, marksheets) should look like, and flags deviations in font, spacing, logo placement, watermarks, etc.
- **Signature Verification** — Uses a Siamese Neural Network to compare a suspect signature against reference signatures and output a similarity score.
- **OCR + Cross-Validation** — Extracts text from documents using Tesseract/EasyOCR and cross-checks internal consistency (e.g., does the date format match? Are roll numbers in valid ranges?).
- **Tampering Heatmap** — Generates a visual heatmap overlay showing which areas of the document appear most likely to be altered.

### Tech Stack

| Component | Technology |
|:---|:---|
| Image Forensics | OpenCV + Custom CNN for ELA / copy-move detection |
| Signature Verification | Siamese Network (PyTorch) |
| OCR | Tesseract / EasyOCR / Google Vision API |
| Layout Analysis | LayoutLMv3 (Microsoft) for document understanding |
| Backend | FastAPI (Python) |
| Frontend | React.js |
| Database | MongoDB (document storage) + Redis (caching) |

### Why This Idea?

- **Real-life impact:** Document fraud affects millions — from rental agreements to job applications. No affordable tool exists for the common person.
- **Feasible for hackathon:** ELA and metadata analysis can be implemented quickly; signature verification has well-established architectures; OCR libraries are plug-and-play.
- **Novelty:** Combining multiple forensic techniques into one user-friendly tool is unique — most existing solutions are expensive enterprise products.
- **General public utility:** Anyone — students, landlords, HR departments, banks, parents verifying school documents — can use this.

### Hackathon Deliverable (Prototype Scope)

- Document upload (image/PDF) with ELA tampering heatmap
- Font/layout anomaly detection for 1-2 document types (e.g., Aadhaar, marksheet)
- Signature comparison module (upload reference + suspect)
- Authenticity confidence score + downloadable report

---

## 📊 Comparison Matrix

| Criteria | 🩺 Health Screening | 🚦 Traffic Optimizer | 📄 Fraud Detector |
|:---|:---:|:---:|:---:|
| **Public Impact** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| **Novelty / Uniqueness** | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| **Hackathon Feasibility** | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| **Wow Factor for Judges** | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| **Scalability** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| **Relevance to India** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |

---

## 🎯 My Recommendation

> **Idea 3 (AI Document Fraud Detector)** is the strongest pick for this hackathon because:
> 1. It has the **highest hackathon feasibility** — core features can be prototyped in days, not weeks.
> 2. It produces **visually impressive demos** (heatmaps, side-by-side comparisons) that wow judges.
> 3. It solves a **universally relatable problem** — everyone has dealt with document verification at some point.
> 4. It has strong **novelty** — no free, easy-to-use tool like this exists for the Indian public.
> 5. It combines **multiple AI techniques** (CV, NLP, deep learning) which showcases technical depth.

However, **Idea 1 (Health Screening)** would be the strongest from a **social impact** perspective and could resonate deeply with judges who value humanitarian applications.

---

*Last updated: June 2, 2026*
