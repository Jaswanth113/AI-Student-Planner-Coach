// // api/agent.ts (Definitive, Final Version Optimized for Serverless Speed)

// import { VercelRequest, VercelResponse } from '@vercel/node';
// import { createClient } from '@supabase/supabase-js';
// import { ChatGroq } from '@langchain/groq';
// import { DateTime } from 'luxon';

// // Helper for sending consistent JSON errors
// function sendError(res: VercelResponse, statusCode: number, message: string, details?: any) {
//   res.setHeader('Content-Type', 'application/json');
//   return res.status(statusCode).json({ error: message, details });
// }

// export default async function handler(req: VercelRequest, res: VercelResponse) {
//   const { userInput, userId } = req.body;
  
//   if (!userInput || !userId) {
//     return sendError(res, 400, 'Missing userInput or userId.');
//   }
//   const { GROQ_API_KEY, VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;
//   if (!GROQ_API_KEY || !VITE_SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
//     return sendError(res, 500, 'Server environment not configured.');
//   }
  
//   try {
//     const supabase = createClient(VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    
//     // --- THE DEFINITIVE FIX: Use the fastest model for the single-call architecture ---
//     const llm = new ChatGroq({ apiKey: GROQ_API_KEY, model: "llama3-8b-8192", temperature: 0.1 });
    
//     // Fetch only the most essential User Context to keep the prompt lean
//     const { data: tasks } = await supabase.from('tasks').select('title, status').eq('user_id', userId).limit(3);
//     const todayInIST = DateTime.now().setZone('Asia/Kolkata').toFormat('EEEE, MMMM d, yyyy');

//     // --- NEW, LEANER SINGLE-CALL PROMPT ---
//     const systemPrompt = `
//       You are an expert AI Life Planner assistant. Your job is to analyze the user's message and respond with a single, valid JSON object that represents their intent.
//       Today's Date: ${todayInIST}. User's Top 3 Tasks: ${JSON.stringify(tasks || [])}.

//       Based on the user's message: "${userInput}", determine the intent and structure your response into ONE of the following JSON formats.

//       1.  For creating an item (task, grocery, expense):
//           { 
//             "intent": "create_item", 
//             "type": "task" | "grocery" | "expense",
//             "data": { /* all the extracted fields for that type, including a calculated due_absolute_iso for tasks */ }
//           }

//       2.  For generating a learning plan:
//           { 
//             "intent": "generate_learning_plan",
//             "plan_details": { "topic": "...", "duration_text": "...", "weekly_milestones": [...] }
//           }

//       3.  For answering a question:
//           { 
//             "intent": "answer_question", 
//             "answer": "Your conversational answer here."
//           }
//     `;
    
//     // --- A SINGLE, EFFICIENT AI CALL ---
//     const response = await llm.invoke(systemPrompt);
//     const parsedResponse = JSON.parse(response.content as string);

//     // Execute the Intent (logic remains the same)
//     switch (parsedResponse.intent) {
      
//       case 'create_item': {
//         const itemData = parsedResponse.data;
//         itemData.user_id = userId;
//         const tableName = `${parsedResponse.type}s`;
        
//         // Handle date conversion if the AI provided it
//         if (itemData.due_absolute_iso) {
//             const localDateTime = DateTime.fromISO(itemData.due_absolute_iso, { zone: 'Asia/Kolkata' });
//             if (localDateTime.isValid) {
//                 itemData.due_date_utc = localDateTime.toUTC().toISO();
//                 itemData.due_date_local = localDateTime.toISO();
//                 itemData.timezone = 'Asia/Kolkata';
//             }
//             delete itemData.due_absolute_iso;
//         }

//         const { data: newItem, error } = await supabase.from(tableName).insert(itemData as any).select().single();
//         if (error) throw new Error(`Supabase insert error in ${tableName}: ${error.message}`);
        
//         return res.status(200).json({ type: 'creation_success', item: newItem });
//       }

//       case 'generate_learning_plan': {
//         const { topic, duration_text, weekly_milestones } = parsedResponse.plan_details;
//         const { data: newPlan, error: planError } = await supabase.from('learning_plans').insert({
//             user_id: userId,
//             topic: topic,
//             duration_months: parseInt(duration_text) || 1,
//             weekly_milestones: weekly_milestones,
//         } as any).select().single();
//         if (planError) throw planError;
        
//         return res.status(200).json({ type: 'plan_created', plan: newPlan });
//       }

//       case 'answer_question': {
//         return res.status(200).json({ type: 'answer', text: parsedResponse.answer });
//       }

//       default:
//         return sendError(res, 400, "Unknown or invalid intent from AI.");
//     }
//   } catch (error: any) {
//     console.error('Master Agent Error:', error);
//     return sendError(res, 500, 'An unexpected error occurred in the agent.', { errorMessage: error.message });
//   }
// }

// api/agent.ts (Temporary "Safe Mode" Test Version)

import { VercelRequest, VercelResponse } from '@vercel/node';
import { ChatGroq } from '@langchain/groq';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Check for the most critical environment variable first.
  if (!process.env.GROQ_API_KEY) {
    console.error("CRITICAL: GROQ_API_KEY is not available.");
    return res.status(500).json({ error: "Server configuration error: Missing GROQ_API_KEY." });
  }
  
  try {
    // Attempt to initialize the client.
    console.log("Attempting to initialize ChatGroq client with the latest library version...");
    const llm = new ChatGroq({ apiKey: process.env.GROQ_API_KEY, model: "llama3-8b-8192" });
    console.log("ChatGroq client initialized successfully.");
    
    // Test a very simple API call
    const result = await llm.invoke("Hello!");
    
    return res.status(200).json({ 
      message: "Success! The agent server is running, the new libraries are working, and the Groq client responded.",
      ai_response: result.content
    });

  } catch (error: any) {
    // If anything fails, catch the error and send a detailed response.
    console.error('CRITICAL FAILURE:', error);
    return res.status(500).json({ 
      error: "The agent failed during initialization or its first call.",
      details: error.message,
      stack: error.stack
    });
  }
}