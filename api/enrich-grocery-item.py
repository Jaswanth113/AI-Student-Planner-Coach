# api/enrich-grocery-item.py (Definitive, Correct Python Version)

import os
import httpx
from fastapi import FastAPI, Request, HTTPException
from supabase import create_client
from dotenv import load_dotenv

app = FastAPI()

# Helper to load environment variables and initialize clients
def get_clients():
    load_dotenv()
    supabase_url = os.getenv("VITE_SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    calorie_ninja_key = os.getenv("CALORIENINJA_API_KEY")
    if not all([supabase_url, supabase_key, calorie_ninja_key]):
        raise Exception("Server environment is not configured correctly.")
    supabase = create_client(supabase_url, supabase_key)
    return supabase, calorie_ninja_key

# Helper function to convert units to a standard base (grams)
def convert_to_grams(quantity: float, unit: str) -> float:
    lower_unit = unit.lower()
    if lower_unit == 'kg':
        return quantity * 1000
    # Add other conversions as needed (e.g., L to ml)
    return quantity  # Assume g, pc, or other units not needing conversion

# The main API endpoint for nutrition enrichment
@app.post("/api/enrich-grocery-item")
async def handle_enrichment_request(request: Request):
    try:
        body = await request.json()
        item_name = body.get("item_name")
        quantity = body.get("quantity")
        unit = body.get("unit")
        grocery_id = body.get("grocery_id")
        user_id = body.get("user_id")

        if not all([item_name, quantity is not None, unit, grocery_id, user_id]):
            raise HTTPException(status_code=400, detail="Missing required fields.")

        supabase, calorie_ninja_key = get_clients()

        # --- STEP 1: Get Base Nutrition Data (for 100g) ---
        # We send a CLEAN query to the API, just the item name.
        api_query = item_name.replace(" ", "%20")
        ninja_api_url = f"https://api.calorieninjas.com/v1/nutrition?query={api_query}"
        
        async with httpx.AsyncClient() as client:
            api_response = await client.get(ninja_api_url, headers={'X-Api-Key': calorie_ninja_key})
        
        if api_response.status_code != 200:
            print(f"CalorieNinja API Error for '{item_name}': {api_response.text}")
            # Return a success response but with a note that enrichment failed.
            return {"message": f"Could not fetch nutrition data for {item_name}."}

        nutrition_data = api_response.json()
        base_nutrition = nutrition_data.get("items", [])[0] if nutrition_data.get("items") else None

        if not base_nutrition:
            print(f"No nutrition data found for '{item_name}'")
            return {"message": f"No nutrition data found for {item_name}."}

        # --- STEP 2: The Definitive Calculation Logic ---
        final_calories = 0.0
        final_protein = 0.0
        final_fat = 0.0
        final_carbohydrates = 0.0
        # ... (add other nutrients as needed)

        serving_size_g = base_nutrition.get("serving_size_g", 100)
        if serving_size_g == 0: serving_size_g = 100 # Avoid division by zero

        if unit.lower() == 'pc':
            final_calories = base_nutrition.get("calories", 0) * quantity
            final_protein = base_nutrition.get("protein_g", 0) * quantity
            final_fat = base_nutrition.get("fat_total_g", 0) * quantity
            final_carbohydrates = base_nutrition.get("carbohydrates_total_g", 0) * quantity
        else:
            calories_per_gram = base_nutrition.get("calories", 0) / serving_size_g
            protein_per_gram = base_nutrition.get("protein_g", 0) / serving_size_g
            fat_per_gram = base_nutrition.get("fat_total_g", 0) / serving_size_g
            carbohydrates_per_gram = base_nutrition.get("carbohydrates_total_g", 0) / serving_size_g
            
            user_quantity_in_grams = convert_to_grams(quantity, unit)

            final_calories = calories_per_gram * user_quantity_in_grams
            final_protein = protein_per_gram * user_quantity_in_grams
            final_fat = fat_per_gram * user_quantity_in_grams
            final_carbohydrates = carbohydrates_per_gram * user_quantity_in_grams

        enriched_data = {
            "calories": round(final_calories),
            "protein_g": round(final_protein, 1),
            "fat_total_g": round(final_fat, 1),
            "carbohydrates_total_g": round(final_carbohydrates, 1),
        }

        # --- STEP 3: Update Supabase with ACCURATE data ---
        update_res = supabase.from_('groceries').update(enriched_data).eq('id', grocery_id).eq('user_id', user_id).execute()

        if update_res.data:
            return update_res.data[0]
        else:
            raise HTTPException(status_code=500, detail="Failed to update item in Supabase.")

    except Exception as e:
        print(f"Enrichment Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))