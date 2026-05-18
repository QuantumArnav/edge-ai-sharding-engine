# 🌌 Edge AI Sharding Engine

[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](#)
[![React](https://img.shields.io/badge/React_19-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](#)


> A high-performance simulation of a distributed AI network that auto-partitions neural networks across peer-to-peer (P2P) edge devices, featuring dynamic routing and robust fault tolerance.

## 📖 Overview

As AI models grow in computational complexity, executing them on single edge devices becomes a bottleneck. The **Edge AI Sharding Engine** tackles this by treating a cluster of edge devices as a cohesive, distributed inference engine. 

By intelligently analyzing resource allocation and network topology, the engine partitions large AI models into optimized shards. These shards are distributed across available P2P nodes, utilizing dynamic routing algorithms to minimize latency and ensure that inference tasks continue seamlessly—even if individual nodes drop offline.

## ✨ Core Features

* **Dynamic Auto-Partitioning:** Automatically slices neural network architectures into lightweight shards based on real-time node capacity and computational constraints.
* **Adaptive P2P Routing:** Utilizes advanced routing algorithms to establish low-latency communication pathways between edge nodes.
* **Fault Tolerance & Self-Healing:** Continuously monitors node health. If a peer drops, the engine instantly reroutes the computation to healthy nodes without failing the inference request.
* **Gemini-Powered Orchestration:** Leverages the `@google/genai` SDK to intelligentally orchestrate sharding logic and simulate complex inference workloads.
* **Real-Time Visualization:** A responsive, motion-enhanced React frontend to monitor shard distribution, network health, and routing topology in real-time.

## 🏗️ System Architecture

1.  **Inference Gateway (Express/Node.js):** Receives the initial AI prompt/task and evaluates the current state of the P2P edge network.
2.  **Sharding Orchestrator:** Calculates the optimal division of labor.
3.  **Distributed Execution:** Shards are pushed to respective virtual edge nodes.
4.  **Result Aggregation:** Nodes process their specific partitions and route the outputs back through the network topology for final synthesis.

## 🛠️ Tech Stack

* **Frontend:** React 19, Vite, Tailwind CSS v4, Motion (for topology animations)
* **Backend:** Node.js, Express
* **AI Integration:** `@google/genai` (Google Gen AI SDK)
* **Core Language:** Strict TypeScript (96% of the codebase)

## 🚀 Getting Started

### Prerequisites

Ensure you have **Node.js** (v18+ recommended) installed on your system.

### Installation

1.  **Clone the repository:**
    ```bash
    git clone [https://github.com/QuantumArnav/edge-ai-sharding-engine.git](https://github.com/QuantumArnav/edge-ai-sharding-engine.git)
    cd edge-ai-sharding-engine
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Environment Setup:**
    Create a `.env` or `.env.local` file in the root directory and add your Google Gemini API key:
    ```env
    GEMINI_API_KEY=your_actual_api_key_here
    ```

4.  **Start the Development Server:**
    ```bash
    npm run dev
    ```

## 🗺️ Roadmap

- [ ] Implement simulated spectral sparsifiers to optimize the network graph visualization.
- [ ] Add support for multiple concurrent inference streams.
- [ ] Introduce a simulated consensus mechanism for shard validation.
- [ ] Containerize edge nodes using Docker for more realistic local testing.

## 🤝 Contributing

Contributions, issues, and feature requests are welcome! Feel free to check the [issues page](https://github.com/QuantumArnav/edge-ai-sharding-engine/issues).

## 📄 License

This project is licensed under the MIT License.
