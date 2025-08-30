# AI Life Planner - Development Setup

## ⚠️ IMPORTANT UPDATE (August 30, 2025)
The AI agent has been updated to use **Llama 3.1 8B Instant** model due to the deprecation of both Mixtral 8x7B and Llama 3.1 70B. Your project is now ready to work with the latest supported Groq models!

## 🚀 Quick Start

### Option 1: Windows Batch Script (Recommended)
Double-click `start-dev.bat` to start both servers automatically.

### Option 2: Manual Setup
Open two terminal windows:

**Terminal 1 - Backend (FastAPI):**
```bash
python -m uvicorn api.agent:app --host 127.0.0.1 --port 8000 --reload --reload-dir api
```

**Terminal 2 - Frontend (Vite):**
```bash
npm run dev
```

## 🌐 Access URLs
- **Frontend**: http://localhost:8080
- **Backend API**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs

## 🔧 Environment Variables Required
Create a `.env` file with:
```
GROQ_API_KEY=your_groq_api_key_here
VITE_SUPABASE_URL=your_supabase_project_url
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
VITE_SUPABASE_PUBLISHABLE_KEY=your_supabase_anon_key
```

## 📋 Development Commands
- `npm run dev` - Start frontend development server
- `npm run build` - Build for production
- `python run_api.py` - Alternative way to run the backend
- `python dev.py` - Python script to run both servers
- `python test_agent.py` - Test the AI agent functionality

## 🧪 Testing Your Setup
Before using the full application, test the AI agent:
```bash
python test_agent.py
```
This will verify that:
- ✅ Environment variables are configured correctly
- ✅ Groq API connection is working
- ✅ Llama 3.1 8B Instant model is responding
- ✅ JSON parsing is functioning properly

## 🔍 Testing the Agent
Once both servers are running, go to http://localhost:8080 and navigate to the AI Assistant page to test the enhanced agent functionality.

## 📁 Project Structure
```
├── api/
│   ├── agent.py          # Enhanced AI agent (FastAPI)
│   └── requirements.txt  # Python dependencies
├── src/
│   ├── components/       # React components
│   ├── pages/           # Application pages
│   ├── hooks/           # Custom React hooks
│   └── integrations/    # External service integrations
├── start-dev.bat        # Windows development launcher
├── dev.py              # Python development launcher
└── test_agent.py       # Agent testing script
```

## 🛠️ Troubleshooting

### "Model has been decommissioned" Error
✅ **Fixed!** The agent now uses `llama-3.1-8b-instant` instead of the deprecated models (`mixtral-8x7b-32768`, `llama-3.1-70b-versatile`).

### Port Already in Use
- **Frontend**: Change port in `vite.config.ts` from `8080` to another port
- **Backend**: Change port in commands from `8000` to another port

### Environment Variables Missing
1. Ensure `.env` file exists in project root
2. Check that all required variables are set
3. Restart both servers after adding variables

### Database Connection Issues
- Verify Supabase URL and keys in `.env`
- Check if Supabase project is active
- Ensure RLS policies allow your operations
