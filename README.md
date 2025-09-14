# AI Life Planner & Personal Coach

**AI Life Planner & Personal Coach** is an **Agentic AI-powered productivity platform** that integrates tasks, goals, learning, budgeting, and groceries into one intelligent system.  
It transforms natural language commands into actionable plans while providing personalized AI assistance for time, health, and learning management.  

---

## Table of Contents
- [Overview](#overview)  
- [Core Features](#core-features)  
- [System Architecture](#system-architecture)  
- [Installation](#installation)  
- [Usage](#usage)  
- [Results](#results)  

---

## Overview
Instead of using multiple apps for tasks, groceries, expenses, and learning, this project provides a **single AI-powered hub**.  

With one command (e.g., *“Plan my study schedule for 2 months and prepare a ₹2000 grocery list”*), the system:  
- Generates actionable tasks & calendar events  
- Designs study or fitness roadmaps  
- Suggests budget-conscious grocery/nutrition plans  
- Tracks expenses with AI categorization  
- Provides personalized insights through an interactive AI assistant  

---

## Core Features
- **Dashboard** → At-a-glance summary with agenda, deadlines, goal progress, budget, and notifications.  
- **Planner** → Unified calendar with drag-and-drop rescheduling for tasks, commitments, and reminders.  
- **Tasks & Goals** → Full task manager with overdue tracking, goal cards, and linked subtasks.  
- **Learning Mentor** → Auto-generates week-by-week learning plans (e.g., *“Learn Design in 2 months”*) and syncs tasks.  
- **Grocery & Budgeting** → Goal-oriented grocery lists, nutrition tracking, real-time cost estimation, and diet planning.  
- **Expenses** → AI-based expense categorization, spending summaries, and budget insights.  
- **AI Assistant** → Conversational hub to query your data (*“What’s on my schedule tomorrow?”*), suggest time optimizations, or proactively add commitments.  
- **Responsive UI** → Clean, mobile-friendly design with intuitive navigation and quick actions.  

---

## System Architecture
- **Frontend (40%)** → React + TypeScript, responsive UI with Tailwind CSS  
- **Backend (40%)** → Python, FastAPI, multi-agent orchestration with LangChain  
- **AI & APIs (10%)** → Groq LLMs (Llama 3, Mixtral), CalorieNinja API  
- **Database & Auth (10%)** → Supabase (Postgres, RLS, Auth, Realtime)  
