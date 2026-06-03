# 🚦 Idea 2: AI Traffic Signal Optimizer for Indian Cities

## Detailed Architecture & Project Life-Cycle

**Author:** Aritra  
**Hackathon:** Brainware AI Hackathon 2026  
**Last Updated:** June 2, 2026

---

## 1. Problem Statement

Indian cities like Kolkata face crippling traffic congestion. Conventional traffic signals run on **fixed timers** — completely blind to actual traffic conditions. The consequences:

- **128 hours/year** wasted per commuter in Kolkata traffic (TomTom Traffic Index)
- Ambulances stuck in jams — **delayed by 10-20 minutes** on average
- **₹1.5 Lakh Crore/year** economic loss due to congestion nationwide
- Massive fuel wastage and air pollution from idling vehicles

Existing CCTV cameras at intersections are used only for surveillance — their video feeds are never analyzed for traffic optimization.

---

## 2. Proposed Solution

An **AI-powered adaptive traffic signal control system** that processes real-time CCTV feeds to:
1. Count and classify vehicles at each approach
2. Dynamically adjust green-light durations based on actual demand
3. Detect and prioritize emergency vehicles
4. Provide a live analytics dashboard for traffic planners

---

## 3. System Architecture

### 3.1 High-Level Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                       EDGE LAYER (Per Intersection)                     │
│                                                                         │
│  ┌──────────────┐     ┌──────────────────┐     ┌────────────────────┐  │
│  │  CCTV Camera  │────▶│  YOLO Vehicle    │────▶│  Vehicle Count +   │  │
│  │  Feed (RTSP)  │     │  Detector        │     │  Queue Length       │  │
│  └──────────────┘     └──────────────────┘     └─────────┬──────────┘  │
│                                                           │             │
│  ┌──────────────┐     ┌──────────────────┐               │             │
│  │  Microphone   │────▶│  Siren Audio     │───────────────┤             │
│  │  (Optional)   │     │  Classifier      │               │             │
│  └──────────────┘     └──────────────────┘               │             │
│                                                           │             │
└───────────────────────────────────────────────────────────┼─────────────┘
                                                            │
                                                            ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    DECISION ENGINE (RL Agent)                            │
│                                                                         │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │                    State Observation                              │   │
│  │  • Vehicle counts per lane (N, S, E, W)                          │   │
│  │  • Queue lengths per approach                                    │   │
│  │  • Current signal phase & elapsed time                           │   │
│  │  • Emergency vehicle detected? (boolean)                         │   │
│  │  • Time of day / day of week                                     │   │
│  └──────────────────────────────────┬───────────────────────────────┘   │
│                                     │                                   │
│                                     ▼                                   │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │                    RL Policy Network (PPO/DQN)                   │   │
│  │                                                                  │   │
│  │  Action Space:                                                   │   │
│  │  • Select next green phase (N-S, E-W, Left-turn, etc.)          │   │
│  │  • Set green duration (10s - 90s range, 5s increments)           │   │
│  │                                                                  │   │
│  │  Reward Function:                                                │   │
│  │  • - (total wait time across all lanes)                          │   │
│  │  • - (queue length sum)                                          │   │
│  │  • + (throughput: vehicles cleared per cycle)                    │   │
│  │  • + (large bonus for emergency vehicle cleared quickly)         │   │
│  └──────────────────────────────────┬───────────────────────────────┘   │
│                                     │                                   │
│                                     ▼                                   │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │                    Signal Command                                │   │
│  │  { phase: "NS_GREEN", duration: 35, priority: "EMERGENCY" }     │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                                                                         │
└──────────────────────────────────────────┬──────────────────────────────┘
                                           │
                                           ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                      BACKEND & ANALYTICS LAYER                          │
│                                                                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌────────────┐ │
│  │  FastAPI      │  │  WebSocket   │  │  TimescaleDB │  │  Redis     │ │
│  │  REST API     │  │  Server      │  │  (Time-series│  │  (Real-time│ │
│  │              │  │  (Live data) │  │   traffic DB)│  │   cache)   │ │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  └─────┬──────┘ │
│         │                 │                  │                │        │
└─────────┼─────────────────┼──────────────────┼────────────────┼────────┘
          │                 │                  │                │
          ▼                 ▼                  ▼                ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                      DASHBOARD (Frontend)                               │
│                                                                         │
│  ┌───────────────┐  ┌────────────────┐  ┌─────────────────────────┐    │
│  │  Live Traffic  │  │  Intersection  │  │  Historical Analytics   │    │
│  │  Heatmap       │  │  Detail View   │  │  (Trends, Comparisons)  │    │
│  │  (City-wide)   │  │  (Per signal)  │  │                         │    │
│  └───────────────┘  └────────────────┘  └─────────────────────────┘    │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### 3.2 Component Breakdown

| Component | Responsibility | Technology |
|:---|:---|:---|
| **Vehicle Detector** | Real-time object detection from CCTV frames | YOLOv8/v9 (Ultralytics) — pre-trained on COCO, fine-tuned on Indian traffic |
| **Vehicle Counter** | Count vehicles per lane, estimate queue length | Custom tracker (ByteTrack / SORT) on top of YOLO detections |
| **Siren Detector** | Classify audio for ambulance/fire truck sirens | 1D CNN on Mel-spectrograms (trained on UrbanSound8K + custom siren data) |
| **RL Agent** | Learn optimal signal timing policy | Stable-Baselines3 (PPO algorithm) trained in SUMO simulator |
| **SUMO Simulator** | Simulate realistic intersection traffic for RL training | SUMO (Simulation of Urban Mobility) — open source |
| **Backend API** | Serve predictions, manage state, store data | FastAPI + WebSockets |
| **Time-series DB** | Store traffic counts, signal logs at 1-second resolution | PostgreSQL + TimescaleDB extension |
| **Dashboard** | Visualize live and historical traffic data | React.js + Mapbox/Leaflet + D3.js/Recharts |

---

## 4. Project Life-Cycle

### Phase 1: Simulation Environment Setup (Week 1 — June 2–8)

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  Install SUMO │────▶│  Model a     │────▶│  Calibrate   │
│  & TraCI API  │     │  Kolkata     │     │  Traffic      │
│              │     │  Intersection│     │  Demand       │
└──────────────┘     └──────────────┘     └──────────────┘
```

**Tasks:**
- [ ] Install SUMO traffic simulator and configure TraCI (Python interface)
- [ ] Model a real Kolkata intersection (e.g., Barasat Crossing near university)
- [ ] Define road network: lanes, turn lanes, pedestrian crossings
- [ ] Calibrate traffic demand profiles: morning rush, off-peak, evening rush
- [ ] Collect sample Indian traffic videos (YouTube / own recordings) for YOLO testing
- [ ] Download and explore UrbanSound8K dataset for siren detection

**Deliverables:**
- Working SUMO simulation of 1 intersection
- Traffic demand profiles (3 scenarios)
- Sample video dataset catalog

---

### Phase 2: AI Model Development (Week 2 — June 9–15)

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  Fine-tune   │     │  Train RL    │     │  Train Siren │
│  YOLOv8 on   │     │  Agent in    │     │  Classifier  │
│  Indian      │     │  SUMO        │     │  (CNN)       │
│  traffic     │     │  Environment │     │              │
└──────┬───────┘     └──────┬───────┘     └──────┬───────┘
       │                    │                    │
       └────────────────────┼────────────────────┘
                            │
                            ▼
                   ┌──────────────────┐
                   │  Integration &   │
                   │  Testing         │
                   └──────────────────┘
```

**Tasks:**
- [ ] Fine-tune YOLOv8-nano on Indian vehicle classes (auto-rickshaw, cycle-rickshaw, truck, bus, car, bike, pedestrian)
- [ ] Implement ByteTrack tracker for counting vehicles crossing virtual lines
- [ ] Design RL environment: define state space, action space, and reward function
- [ ] Train PPO agent in SUMO (target: 1000+ episodes, converge on better-than-fixed-timer policy)
- [ ] Compare RL agent vs. fixed-timer baseline (measure: avg wait time, throughput, max queue)
- [ ] Train siren audio classifier (target: >90% accuracy on siren vs. non-siren)

**Deliverables:**
- Fine-tuned YOLO model for Indian traffic
- Trained RL policy (saved checkpoint)
- Performance comparison report (RL vs fixed timer)
- Siren classifier model

---

### Phase 3: Dashboard & Integration (Week 3 — June 16–22)

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  Build React  │────▶│  WebSocket   │────▶│  Connect     │
│  Dashboard    │     │  Real-time   │     │  All         │
│  UI           │     │  Data Feed   │     │  Components  │
└──────────────┘     └──────────────┘     └──────────────┘
          │                                       │
          ▼                                       ▼
┌──────────────┐                         ┌──────────────┐
│  Demo Video  │                         │  Submit      │
│  Preparation │                         │  Proposal    │
└──────────────┘                         └──────────────┘
```

**Tasks:**
- [ ] Build React dashboard: live map view, intersection detail panel, charts
- [ ] Implement WebSocket server for streaming detection data to dashboard
- [ ] Build FastAPI endpoints for historical data queries
- [ ] Create end-to-end demo: Video → YOLO → Count → RL Decision → Dashboard update
- [ ] Record demo video showing before/after comparison
- [ ] **Submit hackathon proposal by June 22**

**Deliverables:**
- Working web dashboard
- End-to-end demo pipeline
- Hackathon proposal submission

---

### Phase 4: Prototype Polish (July)

**Tasks:**
- [ ] Multi-intersection coordination (2-3 signals in a corridor)
- [ ] Add congestion prediction (LSTM/Prophet on historical data)
- [ ] Improve dashboard aesthetics and interactivity
- [ ] Stress-test with different traffic scenarios

---

### Phase 5: Final Presentation (August)

**Tasks:**
- [ ] Prepare 5-minute demo with live simulation
- [ ] Create presentation slides with before/after metrics
- [ ] Practice pitch: problem → solution → demo → impact → future

---

## 5. Data Flow Diagram

```
CCTV Feed (30 fps)
       │
       ▼
┌──────────────────┐
│  Frame Sampling  │  (Process every 5th frame = 6 fps)
│  & Preprocessing │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  YOLOv8 Object   │  Detections: [{class: "car", bbox: [...], conf: 0.92}, ...]
│  Detection       │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  ByteTrack       │  Tracked objects with IDs
│  Multi-Object    │  + direction of travel
│  Tracker         │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  Lane Counter    │  Count vehicles crossing virtual counting lines
│  & Queue         │  Estimate queue length (pixels → meters)
│  Estimator       │
└────────┬─────────┘
         │
         ├──────────────────────────────────────┐
         │                                      │
         ▼                                      ▼
┌──────────────────┐                   ┌──────────────────┐
│  RL Agent        │                   │  WebSocket →     │
│  (State → Action)│                   │  Dashboard       │
│  Signal Decision │                   │  (Live View)     │
└────────┬─────────┘                   └──────────────────┘
         │
         ▼
┌──────────────────┐
│  Signal Command  │  → Traffic light controller (simulated)
│  Execution       │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  TimescaleDB     │  Store: timestamp, lane_counts, phase, wait_time
│  (Log Everything)│
└──────────────────┘
```

---

## 6. MVP Definition (Minimum Viable Product)

> **Goal:** Show a compelling side-by-side demo: fixed-timer signal vs. AI-optimized signal, with clear metrics improvement.

### 6.1 MVP Feature Set

| Feature | In MVP? | Details |
|:---|:---:|:---|
| Vehicle detection from video | ✅ | YOLOv8-nano on pre-recorded Indian traffic video |
| Vehicle counting per lane | ✅ | ByteTrack + virtual counting lines |
| RL-based signal optimization | ✅ | PPO agent trained in SUMO for 1 intersection |
| Before/after comparison | ✅ | Side-by-side: fixed timer vs. RL agent (avg wait time, throughput) |
| Web dashboard (live view) | ✅ | Map + intersection view + real-time charts |
| Emergency vehicle detection | ✅ | Visual detection (YOLO class) — audio siren detection is stretch goal |
| Multi-intersection coordination | ❌ | Deferred to Phase 4 |
| Real CCTV integration | ❌ | Use recorded videos for demo |
| Congestion prediction | ❌ | Future scope |
| Mobile app | ❌ | Web-only for MVP |

### 6.2 MVP Demo Script (5 minutes)

```
0:00 - 0:30  │  Problem slide: Kolkata traffic stats, wasted hours, lives lost
0:30 - 1:00  │  Solution overview: "What if traffic signals could see and think?"
1:00 - 2:00  │  YOLO Demo: Play Indian traffic video → show bounding boxes + counts
2:00 - 3:30  │  RL Demo: SUMO simulation side-by-side
             │    Left: Fixed timer (60s each) → long queues build up
             │    Right: RL agent → adapts to traffic flow, shorter queues
             │    Show metrics: 35% reduction in avg wait time
3:30 - 4:00  │  Emergency Demo: Ambulance detected → instant green corridor
4:00 - 4:30  │  Dashboard Demo: Live heatmap, charts, analytics
4:30 - 5:00  │  Impact + Future: Smart Cities Mission, scalability, real deployment path
```

### 6.3 MVP Tech Stack (Simplified)

| Layer | MVP Choice | Why |
|:---|:---|:---|
| **Detection** | **YOLOv8-nano (Ultralytics)** | Pre-trained, fast, easy to fine-tune |
| **Tracking** | **ByteTrack** | State-of-the-art MOT, open source |
| **RL Training** | **Stable-Baselines3 PPO + SUMO** | Well-documented, proven for traffic signal control |
| **Backend** | **FastAPI + WebSocket** | Lightweight, async, perfect for streaming |
| **Dashboard** | **React + Recharts + Leaflet** | Fast to build, good-looking charts and maps |
| **Database** | **SQLite (MVP) / PostgreSQL** | Sufficient for single-intersection demo |
| **Hosting** | **Local demo (laptop)** | SUMO + YOLO run locally for hackathon presentation |

### 6.4 MVP File/Folder Structure

```
traffic-optimizer/
├── detection/
│   ├── detect.py               # YOLO inference on video frames
│   ├── tracker.py              # ByteTrack vehicle tracking
│   ├── counter.py              # Lane-wise vehicle counting
│   └── models/
│       └── yolov8n_indian.pt   # Fine-tuned YOLO weights
├── rl_agent/
│   ├── environment.py          # SUMO-Gym RL environment wrapper
│   ├── train.py                # Train PPO agent
│   ├── evaluate.py             # Compare RL vs. fixed timer
│   ├── config.yaml             # Hyperparameters
│   └── checkpoints/
│       └── ppo_traffic.zip     # Trained policy
├── simulation/
│   ├── intersection.net.xml    # SUMO road network
│   ├── traffic_demand.rou.xml  # Vehicle routes & demand
│   ├── sumo_config.sumocfg     # SUMO simulation config
│   └── utils.py                # TraCI helper functions
├── emergency/
│   ├── siren_detector.py       # Audio siren classification (stretch)
│   └── visual_detector.py      # YOLO-based ambulance detection
├── backend/
│   ├── main.py                 # FastAPI app
│   ├── ws_server.py            # WebSocket streaming
│   ├── models.py               # Pydantic schemas
│   └── requirements.txt
├── dashboard/
│   ├── public/
│   │   └── index.html
│   ├── src/
│   │   ├── App.jsx
│   │   ├── components/
│   │   │   ├── MapView.jsx     # Leaflet map with intersection markers
│   │   │   ├── SignalPanel.jsx  # Current signal state display
│   │   │   ├── TrafficChart.jsx # Real-time vehicle count chart
│   │   │   └── StatsCard.jsx   # KPI cards (avg wait, throughput)
│   │   └── hooks/
│   │       └── useWebSocket.js # WebSocket data hook
│   └── package.json
├── notebooks/
│   ├── yolo_finetuning.ipynb
│   └── rl_analysis.ipynb
└── README.md
```

### 6.5 MVP API Endpoints

| Method | Endpoint | Description |
|:---|:---|:---|
| GET | `/api/intersection/{id}/state` | Current signal state + vehicle counts |
| GET | `/api/intersection/{id}/history?from=&to=` | Historical traffic data |
| WS | `/ws/live/{intersection_id}` | Real-time stream: counts, signal phase, detections |
| POST | `/api/simulation/start` | Start SUMO simulation with RL agent |
| POST | `/api/simulation/compare` | Run fixed-timer vs RL comparison |
| GET | `/api/stats/summary` | Aggregate stats: avg wait, throughput, improvement % |

### 6.6 MVP Timeline (3 Weeks)

```
Week 1 (June 2-8)          Week 2 (June 9-15)         Week 3 (June 16-22)
┌────────────────────┐     ┌────────────────────┐     ┌────────────────────┐
│ • Install SUMO     │     │ • Fine-tune YOLO   │     │ • Build dashboard  │
│ • Model intersect. │     │ • Implement tracker │     │ • WebSocket feed   │
│ • Define RL env    │     │ • Train RL agent    │     │ • End-to-end demo  │
│ • Collect videos   │     │ • Baseline compare  │     │ • Record demo      │
│ • Design dashboard │     │ • Emergency detect  │     │ • Submit proposal  │
│   wireframes       │     │ • Backend API       │     │                    │
└────────────────────┘     └────────────────────┘     └────────────────────┘
```

---

## 7. RL Agent Design (Deep Dive)

### 7.1 State Space

```python
state = {
    "vehicle_count_NS": int,       # Vehicles waiting on North-South approach
    "vehicle_count_EW": int,       # Vehicles waiting on East-West approach
    "queue_length_NS": float,      # Queue length in meters (N-S)
    "queue_length_EW": float,      # Queue length in meters (E-W)
    "current_phase": int,          # 0=NS_GREEN, 1=EW_GREEN, 2=LEFT_TURN, 3=ALL_RED
    "phase_elapsed": float,        # Seconds elapsed in current phase
    "emergency_NS": bool,          # Emergency vehicle on N-S approach?
    "emergency_EW": bool,          # Emergency vehicle on E-W approach?
    "time_of_day": float,          # Normalized (0-1) time of day
}
```

### 7.2 Action Space

```python
actions = [
    0,  # Keep current phase (extend green by 5s)
    1,  # Switch to NS_GREEN
    2,  # Switch to EW_GREEN
    3,  # Switch to LEFT_TURN phase
]
```

### 7.3 Reward Function

```python
def compute_reward(state, action, next_state):
    # Negative reward for total waiting time
    wait_penalty = -0.1 * total_waiting_time_all_lanes()
    
    # Negative reward for long queues
    queue_penalty = -0.05 * total_queue_length()
    
    # Positive reward for throughput
    throughput_bonus = 0.5 * vehicles_cleared_this_step()
    
    # Large bonus for clearing emergency vehicles quickly
    emergency_bonus = 10.0 if emergency_cleared else 0.0
    
    # Penalty for too-frequent phase switching (causes confusion)
    switch_penalty = -2.0 if switched_phase_too_quickly(<10s) else 0.0
    
    return wait_penalty + queue_penalty + throughput_bonus + emergency_bonus + switch_penalty
```

---

## 8. Risk Assessment & Mitigation

| Risk | Impact | Mitigation |
|:---|:---|:---|
| SUMO setup complexity | Medium | Use pre-built example networks; start with simplest 4-way intersection |
| RL agent doesn't converge | High | Start with DQN (simpler); use reward shaping; have fixed-timer-with-rules fallback |
| YOLO slow on laptop for demo | Medium | Use YOLOv8-nano; process at 6fps; pre-process video offline if needed |
| Indian vehicle classes not in COCO | Medium | Fine-tune on IDD (Indian Driving Dataset) or manually annotate 200-300 images |
| No access to real CCTV feeds | Low | Use YouTube traffic videos from Indian cities; record own videos if needed |

---

## 9. Expected Impact Metrics (From Simulation)

| Metric | Fixed Timer | RL-Optimized | Improvement |
|:---|:---:|:---:|:---:|
| Avg wait time per vehicle | 45s | 28s | **38% ↓** |
| Max queue length | 32 vehicles | 18 vehicles | **44% ↓** |
| Throughput (vehicles/hour) | 1,200 | 1,580 | **32% ↑** |
| Emergency vehicle delay | 180s | 25s | **86% ↓** |

> *These are target metrics based on published research on RL-based traffic signal control. Actual numbers will depend on simulation calibration.*

---

## 10. Future Scope (Post-Hackathon)

- **Multi-intersection green wave** coordination using multi-agent RL
- **Real CCTV integration** with city traffic management centers
- **V2I communication** (Vehicle-to-Infrastructure) for connected vehicles
- **Pedestrian crossing optimization** with walk signal timing
- **Air quality integration** — prioritize reducing idle time near hospitals/schools
- **Mobile app for commuters** — real-time signal countdown and route optimization

---

*This document serves as the complete architectural blueprint for Idea 2. Refer to the [main ideas summary](./ideas.md) for comparison with other proposals.*
