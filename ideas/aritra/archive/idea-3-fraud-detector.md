# 📄 Idea 3: AI Document Fraud Detector for Everyday Citizens

## Detailed Architecture & Project Life-Cycle

**Author:** Aritra  
**Hackathon:** Brainware AI Hackathon 2026  
**Last Updated:** June 2, 2026

---

## 1. Problem Statement

Document fraud is **endemic in India** — affecting millions of everyday transactions:

- **Fake educational certificates** used for job applications and admissions
- **Forged identity documents** (Aadhaar, PAN, Voter ID) enabling identity theft
- **Tampered property documents** facilitating fraudulent real estate deals worth crores
- **Doctored income certificates** used for loan fraud and government scheme abuse
- **Manipulated marksheets** and transcripts for higher education admissions

Currently, **no affordable, accessible tool** exists for the common citizen, landlord, small business owner, or HR department to verify document authenticity. Professional forensic analysis costs ₹5,000–50,000 per document and takes days. This idea brings that capability to everyone — for free, in seconds.

---

## 2. Proposed Solution

A **web application where anyone can upload a document (image or PDF) and receive an instant AI-generated authenticity report**, highlighting:

1. Areas of pixel-level tampering
2. Font and layout anomalies
3. Signature mismatch scores
4. Text consistency checks
5. A visual tampering heatmap
6. An overall authenticity confidence score

---

## 3. System Architecture

### 3.1 High-Level Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        USER INTERFACE (Web App)                         │
│                                                                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌────────────┐ │
│  │  Document     │  │  Analysis    │  │  Tampering   │  │  Download  │ │
│  │  Upload       │  │  Results     │  │  Heatmap     │  │  Report    │ │
│  │  (Drag+Drop)  │  │  Dashboard   │  │  Overlay     │  │  (PDF)     │ │
│  └──────┬───────┘  └──────────────┘  └──────────────┘  └────────────┘ │
│         │                ▲                  ▲                ▲         │
└─────────┼────────────────┼──────────────────┼────────────────┼─────────┘
          │                │                  │                │
          ▼                │                  │                │
┌─────────────────────────────────────────────────────────────────────────┐
│                      BACKEND API LAYER (FastAPI)                        │
│                                                                         │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │                     API Gateway / Router                         │   │
│  │  POST /api/analyze    POST /api/signature    GET /api/report     │   │
│  └──────────────────────────────┬───────────────────────────────────┘   │
│                                 │                                       │
│  ┌──────────────────────────────┼───────────────────────────────────┐   │
│  │              ANALYSIS PIPELINE (Orchestrator)                    │   │
│  │                                                                  │   │
│  │  Step 1        Step 2        Step 3        Step 4        Step 5  │   │
│  │  ┌────────┐   ┌────────┐   ┌────────┐   ┌────────┐   ┌───────┐ │   │
│  │  │Preproc.│──▶│ ELA &  │──▶│ Font & │──▶│ OCR &  │──▶│Score  │ │   │
│  │  │& Meta  │   │Forensic│   │Layout  │   │Text    │   │Aggreg.│ │   │
│  │  │Extract │   │Analysis│   │Check   │   │Verify  │   │& Report│ │   │
│  │  └────────┘   └────────┘   └────────┘   └────────┘   └───────┘ │   │
│  │                                                                  │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  ┌─────────────────────────────────────────────┐                       │
│  │           SIGNATURE VERIFICATION MODULE      │                       │
│  │                                              │                       │
│  │  ┌────────────┐  ┌────────────┐  ┌────────┐ │                       │
│  │  │ Signature  │  │ Siamese    │  │ Score  │ │                       │
│  │  │ Extraction │──▶│ Network   │──▶│ Output │ │                       │
│  │  │ (ROI)      │  │ (Compare)  │  │ (0-1)  │ │                       │
│  │  └────────────┘  └────────────┘  └────────┘ │                       │
│  │                                              │                       │
│  └─────────────────────────────────────────────┘                       │
│                                                                         │
└─────────────────────────────────────────────────┬───────────────────────┘
                                                   │
                                                   ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                        DATA & STORAGE LAYER                             │
│                                                                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────────────┐  │
│  │  MongoDB      │  │  Redis       │  │  Object Storage (S3/Local)   │  │
│  │  (Analysis    │  │  (Session    │  │  (Uploaded docs, heatmaps,   │  │
│  │   logs)       │  │   cache)     │  │   generated reports)         │  │
│  └──────────────┘  └──────────────┘  └──────────────────────────────┘  │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### 3.2 Analysis Pipeline — Deep Dive

```
Input Document (Image / PDF)
           │
           ▼
┌─────────────────────┐
│  STEP 1: PREPROCESS │
│                     │
│  • Convert PDF → images (if PDF)
│  • Resize to standard resolution
│  • Extract EXIF/metadata
│  • Check for metadata anomalies:
│    - Creation date vs modification date mismatch
│    - Software tool flags (Photoshop, GIMP)
│    - GPS/device inconsistencies
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  STEP 2: ERROR      │
│  LEVEL ANALYSIS     │
│  (ELA)              │
│                     │
│  • Re-compress image at 95% JPEG quality
│  • Compute pixel difference between original and re-compressed
│  • Tampered areas show HIGHER error levels (brighter in ELA image)
│  • Generate ELA heatmap overlay
│  • Threshold to identify suspicious regions
│                     │
│  Additional Checks: │
│  • Copy-Move Forgery Detection (keypoint matching with ORB/SIFT)
│  • Noise Analysis (different noise patterns = splicing)
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  STEP 3: FONT &     │
│  LAYOUT ANALYSIS    │
│                     │
│  • Detect text regions using contour analysis
│  • Analyze font consistency:
│    - Compare character sizes across regions
│    - Check line spacing uniformity
│    - Detect mixed fonts (inconsistent rendering)
│  • Layout template matching:
│    - Compare against known Aadhaar/PAN/marksheet templates
│    - Check logo position, watermark presence
│    - Verify standard fields are in expected locations
│  • Color consistency check:
│    - Background color uniformity
│    - Text color consistency
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  STEP 4: OCR &      │
│  TEXT VERIFICATION  │
│                     │
│  • Extract all text using Tesseract/EasyOCR
│  • Cross-validation checks:
│    - Date format consistency (DD/MM/YYYY throughout?)
│    - Number patterns (roll numbers, ID numbers in valid ranges)
│    - Name-gender consistency
│    - Checksum validation (Aadhaar has Verhoeff checksum)
│  • Spelling and grammar analysis
│  • Font rendering analysis (printed vs. digitally overlaid text)
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  STEP 5: SCORE      │
│  AGGREGATION &      │
│  REPORT             │
│                     │
│  Weighted scoring:  │
│  • ELA Score (30%)  │
│  • Metadata (15%)   │
│  • Font/Layout (25%)│
│  • Text Verify (20%)│
│  • Signature (10%)  │
│                     │
│  Final Output:      │
│  • Authenticity Score: 0-100
│  • Verdict: LIKELY AUTHENTIC / SUSPICIOUS / LIKELY TAMPERED
│  • Tampering Heatmap (image overlay)
│  • Detailed findings per check
│  • Downloadable PDF report
└─────────────────────┘
```

### 3.3 Component Table

| Component | Responsibility | Technology |
|:---|:---|:---|
| **Web Frontend** | Upload, results display, heatmap visualization | React.js + Canvas API |
| **API Server** | Orchestrate analysis pipeline, serve results | FastAPI (Python) |
| **Preprocessor** | Image normalization, PDF conversion, metadata extraction | Pillow, PyMuPDF, exifread |
| **ELA Engine** | Error Level Analysis + copy-move detection | OpenCV, NumPy, scikit-image |
| **Font/Layout Analyzer** | Font consistency, template matching | OpenCV (contour detection), custom CNN |
| **OCR Engine** | Text extraction and cross-validation | Tesseract / EasyOCR |
| **Signature Verifier** | Compare suspect signature against reference | Siamese Network (PyTorch) |
| **Report Generator** | Compile analysis into downloadable PDF | ReportLab / WeasyPrint |
| **Heatmap Renderer** | Generate visual tampering overlay | Matplotlib + OpenCV |
| **Database** | Store analysis logs and session data | MongoDB (flexible schema) |
| **Cache** | Session management, rate limiting | Redis |
| **Storage** | Uploaded documents and generated reports | Local filesystem / S3 |

---

## 4. Project Life-Cycle

### Phase 1: Research & Core Algorithm Development (Week 1 — June 2–8)

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  Study Image │────▶│  Implement   │────▶│  Test on     │
│  Forensics   │     │  ELA +       │     │  Known       │
│  Techniques  │     │  Copy-Move   │     │  Tampered    │
│              │     │  Detection   │     │  Samples     │
└──────────────┘     └──────────────┘     └──────────────┘
```

**Tasks:**
- [ ] Study Error Level Analysis (ELA) theory and implementation
- [ ] Study copy-move forgery detection using keypoint matching
- [ ] Implement ELA algorithm from scratch in Python (OpenCV + NumPy)
- [ ] Implement copy-move detection using ORB feature matching
- [ ] Create test dataset: manually tamper 20 documents (using Photoshop/GIMP)
- [ ] Collect real document templates: Aadhaar format, PAN card, university marksheet
- [ ] Validate ELA on test set — tune thresholds for sensitivity
- [ ] Research Siamese Networks for signature verification (CEDAR dataset)

**Deliverables:**
- Working ELA module (Python script → input image → heatmap output)
- Working copy-move detection module
- Test dataset (20 tampered + 20 authentic documents)
- Research notes on font analysis and signature verification

---

### Phase 2: Extended Analysis Modules + Signature Verification (Week 2 — June 9–15)

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  Font &      │     │  OCR +       │     │  Siamese     │
│  Layout      │     │  Text        │     │  Signature   │
│  Analyzer    │     │  Validator   │     │  Network     │
└──────┬───────┘     └──────┬───────┘     └──────┬───────┘
       │                    │                    │
       └────────────────────┼────────────────────┘
                            │
                            ▼
                   ┌──────────────────┐
                   │  Score           │
                   │  Aggregation     │
                   │  Engine          │
                   └──────────────────┘
```

**Tasks:**
- [ ] Build font consistency checker using contour analysis + character size comparison
- [ ] Implement layout template matching for Aadhaar and marksheet formats
- [ ] Set up Tesseract OCR pipeline + post-processing (date validation, checksum checks)
- [ ] Implement Aadhaar Verhoeff checksum validator
- [ ] Train Siamese Network on CEDAR signature dataset (or SigComp2011)
- [ ] Build signature extraction module (ROI selection, background removal)
- [ ] Design weighted scoring system (ELA 30%, Metadata 15%, Font 25%, Text 20%, Signature 10%)
- [ ] Build scoring aggregation engine
- [ ] Test full pipeline on tampered + authentic document set

**Deliverables:**
- Font/layout analysis module
- OCR + text verification module
- Trained Siamese signature verifier
- Integrated scoring engine
- Pipeline accuracy report on test set

---

### Phase 3: Web Application & Report Generation (Week 3 — June 16–22)

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  Build React  │────▶│  FastAPI     │────▶│  PDF Report  │
│  Frontend     │     │  Backend     │     │  Generator   │
│  (Upload +    │     │  Integration │     │              │
│   Results UI) │     │              │     │              │
└──────────────┘     └──────────────┘     └──────────────┘
          │                                       │
          ▼                                       ▼
┌──────────────┐                         ┌──────────────┐
│  Heatmap     │                         │  Submit      │
│  Visualization│                        │  Proposal    │
└──────────────┘                         └──────────────┘
```

**Tasks:**
- [ ] Build React frontend: upload page, analysis progress, results dashboard
- [ ] Implement drag-and-drop upload with file type validation
- [ ] Build interactive heatmap overlay (toggle on/off, zoom, pan)
- [ ] Build side-by-side view: original document vs. ELA heatmap
- [ ] Set up FastAPI backend with all analysis endpoints
- [ ] Implement async analysis (upload → job queue → poll for results)
- [ ] Build PDF report generator with: summary, heatmap, per-module findings, score
- [ ] Deploy frontend (Vercel) + backend (Render/Railway)
- [ ] End-to-end testing with 10+ documents
- [ ] **Submit hackathon proposal by June 22**

**Deliverables:**
- Working web application
- PDF report generation
- Deployed prototype
- Hackathon proposal submission

---

### Phase 4: Prototype Polish (July)

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  User Testing │────▶│  Accuracy    │────▶│  UI/UX       │
│  (10 testers) │     │  Improvement │     │  Polish      │
└──────────────┘     └──────────────┘     └──────────────┘
```

**Tasks:**
- [ ] User testing with 10 peers (upload real and fake documents)
- [ ] Tune ELA thresholds and scoring weights based on false positive/negative rates
- [ ] Add support for more document types (driving license, passport, property papers)
- [ ] Improve heatmap visualization (color gradients, annotations)
- [ ] Add batch upload support
- [ ] Optimize processing speed (target: <5 seconds per document)

---

### Phase 5: Final Presentation (August)

**Tasks:**
- [ ] Prepare live demo: upload a tampered document → show heatmap → download report
- [ ] Create comparison: authentic Aadhaar vs. tampered Aadhaar side-by-side
- [ ] Prepare slides: problem statistics, demo, architecture, impact
- [ ] Practice 5-minute pitch

---

## 5. Data Flow Diagram

```
User uploads document (JPG/PNG/PDF)
              │
              ▼
     ┌─────────────────┐
     │  File Validation │  (Check type, size < 10MB, not corrupt)
     └────────┬────────┘
              │
              ▼
     ┌─────────────────┐
     │  Create Analysis │  (Generate unique job ID)
     │  Job             │
     └────────┬────────┘
              │
              ├────────────────────────────────────────────────┐
              │                                                │
              ▼                                                ▼
     ┌─────────────────┐                              ┌──────────────────┐
     │  Metadata        │                              │  Image           │
     │  Extraction      │                              │  Preprocessing   │
     │                  │                              │  (normalize,     │
     │  • EXIF data     │                              │   deskew, crop)  │
     │  • Creation tool │                              └────────┬─────────┘
     │  • Timestamps    │                                       │
     └────────┬────────┘                                        │
              │                    ┌────────────────────────────┤
              │                    │              │             │
              ▼                    ▼              ▼             ▼
     ┌──────────────┐    ┌──────────────┐ ┌───────────┐ ┌───────────┐
     │  Metadata    │    │  ELA +       │ │ Font &    │ │ OCR +     │
     │  Score       │    │  Copy-Move   │ │ Layout    │ │ Text      │
     │  (0-100)     │    │  Score       │ │ Score     │ │ Score     │
     └──────┬───────┘    │  (0-100)     │ │ (0-100)   │ │ (0-100)   │
            │            │  + Heatmap   │ └─────┬─────┘ └─────┬─────┘
            │            └──────┬───────┘       │             │
            │                   │               │             │
            └───────────────────┼───────────────┼─────────────┘
                                │               │
                                ▼               │
                       ┌──────────────────┐     │
                       │  WEIGHTED SCORE   │◄───┘
                       │  AGGREGATION      │
                       │                   │
                       │  Formula:         │
                       │  S = 0.30×ELA     │
                       │    + 0.15×Meta    │
                       │    + 0.25×Font    │
                       │    + 0.20×Text    │
                       │    + 0.10×Sig     │
                       └────────┬─────────┘
                                │
                       ┌────────┴─────────┐
                       │                  │
                       ▼                  ▼
              ┌──────────────┐   ┌──────────────┐
              │  Results     │   │  PDF Report  │
              │  Dashboard   │   │  Generation  │
              │  (Web UI)    │   │  (Download)  │
              └──────────────┘   └──────────────┘
```

---

## 6. MVP Definition (Minimum Viable Product)

> **Goal:** A user uploads a document, and within 5 seconds sees a tampering heatmap, per-module analysis, and an authenticity score. Judges are wowed by the visual output.

### 6.1 MVP Feature Set

| Feature | In MVP? | Details |
|:---|:---:|:---|
| Document upload (image) | ✅ | JPG, PNG — drag-and-drop + file picker |
| PDF upload support | ✅ | Convert first page to image, analyze |
| Error Level Analysis (ELA) | ✅ | Core forensic technique — generates heatmap |
| Tampering heatmap overlay | ✅ | Toggle-able overlay on original document — the visual "wow" factor |
| Metadata analysis | ✅ | EXIF check for editing software, timestamp anomalies |
| Font consistency check | ✅ | Basic: character size variance, line spacing uniformity |
| OCR + text validation | ✅ | Extract text, check date formats, Aadhaar checksum |
| Authenticity score (0-100) | ✅ | Weighted aggregate of all module scores |
| PDF report download | ✅ | Summary + heatmap + findings in downloadable PDF |
| Signature verification | ⚡ | Stretch goal — include if time permits |
| Copy-move detection | ⚡ | Stretch goal — computationally intensive |
| Batch upload | ❌ | Deferred |
| Historical analysis log | ❌ | Deferred |
| API access for developers | ❌ | Future scope |

### 6.2 MVP User Journey

```
┌───────────────────────────────────────────────────────────────────────────┐
│                          MVP DEMO FLOW                                    │
│                                                                           │
│  Step 1            Step 2            Step 3            Step 4             │
│  ┌──────────┐     ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │ Open App  │────▶│ Drag & Drop  │─▶│ See Analysis │─▶│ Download     │  │
│  │ (Home     │     │ Document     │  │ Results:     │  │ PDF Report   │  │
│  │  Page)    │     │ (Image/PDF)  │  │              │  │              │  │
│  └──────────┘     └──────────────┘  │ • Heatmap    │  └──────────────┘  │
│                                      │ • Score: 23  │                    │
│                                      │ • Verdict:   │                    │
│                                      │   TAMPERED   │                    │
│                                      │ • Details    │                    │
│                                      └──────────────┘                    │
│                                                                           │
│  Optional Flow (Signature):                                               │
│  ┌──────────┐     ┌──────────────┐  ┌──────────────┐                    │
│  │ Upload    │────▶│ Upload       │─▶│ Similarity   │                    │
│  │ Suspect   │     │ Reference    │  │ Score: 34%   │                    │
│  │ Signature │     │ Signature    │  │ MISMATCH     │                    │
│  └──────────┘     └──────────────┘  └──────────────┘                    │
│                                                                           │
└───────────────────────────────────────────────────────────────────────────┘
```

### 6.3 MVP Tech Stack

| Layer | MVP Choice | Why |
|:---|:---|:---|
| **Frontend** | **React.js** | Component-based, fast to build, good for interactive heatmap |
| **Heatmap** | **Canvas API + custom overlay** | Smooth, interactive, toggle-able |
| **Backend** | **FastAPI (Python)** | Native Python ML ecosystem, async support |
| **ELA** | **OpenCV + NumPy (custom)** | Full control, no external dependency |
| **OCR** | **EasyOCR** | Better than Tesseract for Indian scripts, easy setup |
| **Font Analysis** | **OpenCV contour detection** | Lightweight, no model training needed |
| **Signature** | **Siamese Network (PyTorch)** | If time; otherwise defer |
| **PDF Report** | **ReportLab** | Python-native, full control over layout |
| **Hosting** | **Vercel (FE) + Render (BE)** | Free tiers, fast deployment |

### 6.4 MVP File/Folder Structure

```
document-fraud-detector/
├── frontend/
│   ├── public/
│   │   └── index.html
│   ├── src/
│   │   ├── App.jsx                 # Main app + routing
│   │   ├── index.js
│   │   ├── pages/
│   │   │   ├── HomePage.jsx        # Landing page with upload
│   │   │   ├── ResultsPage.jsx     # Analysis results + heatmap
│   │   │   └── SignaturePage.jsx   # Signature comparison (stretch)
│   │   ├── components/
│   │   │   ├── FileUpload.jsx      # Drag-and-drop upload
│   │   │   ├── HeatmapOverlay.jsx  # Interactive ELA heatmap on canvas
│   │   │   ├── ScoreGauge.jsx      # Animated circular score display
│   │   │   ├── FindingsCard.jsx    # Per-module findings card
│   │   │   ├── VerdictBanner.jsx   # AUTHENTIC / SUSPICIOUS / TAMPERED
│   │   │   └── ReportButton.jsx    # Download PDF report button
│   │   ├── styles/
│   │   │   └── index.css           # Global styles
│   │   └── utils/
│   │       └── api.js              # API client
│   └── package.json
├── backend/
│   ├── main.py                     # FastAPI app + routes
│   ├── pipeline/
│   │   ├── orchestrator.py         # Run all analysis modules in sequence
│   │   ├── preprocessor.py         # Image normalization, PDF → image
│   │   ├── ela.py                  # Error Level Analysis
│   │   ├── metadata.py             # EXIF/metadata extraction & analysis
│   │   ├── font_analyzer.py        # Font consistency & layout checks
│   │   ├── ocr_validator.py        # OCR + text cross-validation
│   │   ├── copy_move.py            # Copy-move forgery detection (stretch)
│   │   └── scorer.py               # Weighted score aggregation
│   ├── signature/
│   │   ├── siamese_model.py        # Siamese network definition
│   │   ├── compare.py              # Signature comparison pipeline
│   │   └── models/
│   │       └── siamese_v1.pth      # Trained weights
│   ├── report/
│   │   ├── generator.py            # PDF report builder
│   │   └── templates/
│   │       └── report_template.html # Report HTML template
│   ├── utils/
│   │   ├── image_utils.py          # Common image processing utilities
│   │   ├── validators.py           # Aadhaar checksum, date validators
│   │   └── constants.py            # Scoring weights, thresholds
│   ├── tests/
│   │   ├── test_ela.py
│   │   ├── test_metadata.py
│   │   ├── test_ocr.py
│   │   └── test_pipeline.py
│   ├── test_data/
│   │   ├── authentic/              # Known-authentic documents
│   │   └── tampered/               # Known-tampered documents
│   └── requirements.txt
├── notebooks/
│   ├── ela_exploration.ipynb       # ELA algorithm development
│   ├── signature_training.ipynb    # Siamese network training
│   └── threshold_tuning.ipynb      # Calibrate scoring thresholds
└── README.md
```

### 6.5 MVP API Endpoints

| Method | Endpoint | Description | Input | Output |
|:---|:---|:---|:---|:---|
| POST | `/api/analyze` | Full document analysis | `multipart/form-data: file` | `{ job_id, status }` |
| GET | `/api/analyze/{job_id}` | Get analysis results | — | `{ score, verdict, modules: [...], heatmap_url }` |
| GET | `/api/heatmap/{job_id}` | Get ELA heatmap image | — | `image/png` |
| GET | `/api/report/{job_id}` | Download PDF report | — | `application/pdf` |
| POST | `/api/signature/compare` | Compare two signatures | `multipart: suspect, reference` | `{ similarity: 0.34, verdict: "MISMATCH" }` |
| GET | `/api/health` | Health check | — | `{ status: "ok" }` |

### 6.6 Key Algorithm: Error Level Analysis (ELA)

```python
import cv2
import numpy as np

def perform_ela(image_path, quality=90, scale=15):
    """
    Error Level Analysis — detects image tampering.
    
    Logic:
    1. Load original image
    2. Re-save at specific JPEG quality
    3. Compute absolute pixel difference
    4. Scale up differences for visibility
    5. Tampered areas show HIGHER error levels
    
    Returns: ELA heatmap (numpy array)
    """
    # Read original image
    original = cv2.imread(image_path)
    
    # Re-compress at specified quality
    encode_params = [cv2.IMWRITE_JPEG_QUALITY, quality]
    _, encoded = cv2.imencode('.jpg', original, encode_params)
    recompressed = cv2.imdecode(encoded, cv2.IMREAD_COLOR)
    
    # Compute absolute difference
    diff = cv2.absdiff(original, recompressed)
    
    # Scale up for visibility
    ela_image = diff * scale
    ela_image = np.clip(ela_image, 0, 255).astype(np.uint8)
    
    # Convert to heatmap for visualization
    gray = cv2.cvtColor(ela_image, cv2.COLOR_BGR2GRAY)
    heatmap = cv2.applyColorMap(gray, cv2.COLORMAP_JET)
    
    # Blend with original for overlay
    overlay = cv2.addWeighted(original, 0.6, heatmap, 0.4, 0)
    
    return ela_image, heatmap, overlay
```

### 6.7 Key Algorithm: Aadhaar Verhoeff Checksum

```python
# Verhoeff checksum tables
VERHOEFF_TABLE_D = [
    [0,1,2,3,4,5,6,7,8,9],
    [1,2,3,4,0,6,7,8,9,5],
    [2,3,4,0,1,7,8,9,5,6],
    [3,4,0,1,2,8,9,5,6,7],
    [4,0,1,2,3,9,5,6,7,8],
    [5,9,8,7,6,0,4,3,2,1],
    [6,5,9,8,7,1,0,4,3,2],
    [7,6,5,9,8,2,1,0,4,3],
    [8,7,6,5,9,3,2,1,0,4],
    [9,8,7,6,5,4,3,2,1,0],
]

VERHOEFF_TABLE_P = [
    [0,1,2,3,4,5,6,7,8,9],
    [1,5,7,6,2,8,3,0,9,4],
    [5,8,0,3,7,9,6,1,4,2],
    [8,9,1,6,0,4,3,5,2,7],
    [9,4,5,3,1,2,6,8,7,0],
    [4,2,8,6,5,7,3,9,0,1],
    [2,7,9,3,8,0,6,4,1,5],
    [7,0,4,6,9,1,3,2,5,8],
]

VERHOEFF_TABLE_INV = [0,4,3,2,1,5,6,7,8,9]

def validate_aadhaar(aadhaar_number: str) -> bool:
    """Validate Aadhaar number using Verhoeff checksum."""
    digits = [int(d) for d in aadhaar_number.replace(" ", "")]
    if len(digits) != 12:
        return False
    
    c = 0
    for i, digit in enumerate(reversed(digits)):
        c = VERHOEFF_TABLE_D[c][VERHOEFF_TABLE_P[i % 8][digit]]
    
    return c == 0
```

### 6.8 MVP Timeline (3 Weeks)

```
Week 1 (June 2-8)          Week 2 (June 9-15)         Week 3 (June 16-22)
┌────────────────────┐     ┌────────────────────┐     ┌────────────────────┐
│ • Study ELA theory │     │ • Font/layout      │     │ • React frontend   │
│ • Implement ELA    │     │   analyzer          │     │ • Heatmap overlay  │
│ • Copy-move detect │     │ • OCR + text        │     │ • Score gauge UI   │
│ • Create test data │     │   validation        │     │ • PDF report       │
│ • Metadata extractor│    │ • Siamese signature │     │ • Deploy & test    │
│ • Research papers  │     │ • Score aggregation │     │ • Submit proposal  │
└────────────────────┘     └────────────────────┘     └────────────────────┘
```

---

## 7. Scoring System Design

### 7.1 Per-Module Scores (0-100, where 100 = fully authentic)

| Module | Weight | Score 100 (Clean) | Score 0 (Tampered) |
|:---|:---:|:---|:---|
| **ELA** | 30% | Uniform error levels across document | High-error hotspots in text/image regions |
| **Metadata** | 15% | Consistent timestamps, no editing software | Photoshop metadata, date mismatches |
| **Font/Layout** | 25% | Consistent fonts, standard layout matches template | Mixed fonts, shifted layouts, missing watermarks |
| **OCR/Text** | 20% | Valid checksums, consistent formats, no typos | Failed checksums, mixed date formats, invalid ranges |
| **Signature** | 10% | High similarity to reference (>80%) | Low similarity (<40%) |

### 7.2 Final Verdict Mapping

| Score Range | Verdict | Color | Description |
|:---|:---|:---|:---|
| 80-100 | ✅ LIKELY AUTHENTIC | Green | Document passes all major checks |
| 50-79 | ⚠️ SUSPICIOUS | Yellow/Orange | Some anomalies detected — manual review recommended |
| 0-49 | ❌ LIKELY TAMPERED | Red | Multiple tampering indicators found |

---

## 8. Risk Assessment & Mitigation

| Risk | Impact | Mitigation |
|:---|:---|:---|
| High false positive rate (authentic docs flagged) | High | Extensive threshold tuning on diverse test set; always show "advisory, not definitive" disclaimer |
| JPEG artifacts in authentic photos trigger ELA | Medium | Calibrate ELA quality parameter; account for known compression patterns |
| OCR errors on poor-quality scans | Medium | Use EasyOCR (better than Tesseract); add confidence thresholds; skip OCR if quality too low |
| Legal concerns (users uploading sensitive documents) | Medium | Process in-memory only, don't store documents permanently; add privacy policy |
| Signature verification needs reference signatures | Low | Make signature module optional; works only when user provides reference |
| Processing time too slow for demo | Medium | Optimize image sizes; parallelize modules; pre-compute on smaller resolution |

---

## 9. Why This is the Best Hackathon Pick

| Advantage | Explanation |
|:---|:---|
| **Visually stunning demo** | Heatmap overlays, animated score gauges, side-by-side comparisons — judges will be impressed by the visual output |
| **Universally relatable** | Everyone has submitted or verified documents — the problem needs no explanation |
| **Technically deep** | Combines computer vision (ELA, copy-move), deep learning (Siamese), NLP (OCR), and forensics — shows breadth |
| **Fast to prototype** | ELA is ~20 lines of code, metadata extraction is a library call, OCR is plug-and-play. Core MVP in 1 week |
| **No expensive data needed** | You create your own test data by tampering documents — no dataset downloads or labeling required |
| **Novel** | No free, accessible tool like this exists for Indian citizens — this could genuinely be launched as a product |

---

## 10. Future Scope (Post-Hackathon)

- **Blockchain-based document hashing** — register authentic documents, verify against hash
- **API for enterprises** — banks, HR departments, universities can integrate via REST API
- **WhatsApp Bot** — send a document photo on WhatsApp, get authenticity report back
- **Government integration** — connect to DigiLocker API for cross-verification
- **Multi-page document analysis** — analyze entire PDFs, not just single pages
- **Video forensics** — detect deepfake interview videos
- **Browser extension** — right-click any document image online to verify

---

*This document serves as the complete architectural blueprint for Idea 3. Refer to the [main ideas summary](./ideas.md) for comparison with other proposals.*
