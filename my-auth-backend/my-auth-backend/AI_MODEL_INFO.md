# AI Models Used for Recipe Generation

## Current Implementation

The MealVista app uses **AI models with stored knowledge** (like ChatGPT) to generate personalized recipes.

### Primary Model: `EleutherAI/gpt-neo-125M`
- **Source**: Hugging Face Inference API
- **Type**: Text generation model
- **Knowledge**: Has stored knowledge about recipes, ingredients, and cooking
- **Cost**: 100% FREE (no API key required)
- **Speed**: Fast response times
- **Quality**: Better than GPT-2 for recipe generation

### Fallback Model: `gpt2`
- **Source**: Hugging Face Inference API  
- **Type**: Basic text generation
- **Cost**: 100% FREE (no API key required)
- **Used when**: Primary model fails or times out

### Knowledge-Based System
- **Type**: Custom knowledge base with stored recipe information
- **Contains**: Pre-stored recipes for common searches (egg, chicken, pasta, etc.)
- **Used when**: AI API calls fail or timeout
- **Always returns**: Recipes are guaranteed to be generated

## How It Works

1. **User searches** for a recipe (e.g., "egg")
2. **System tries AI model** (`EleutherAI/gpt-neo-125M`) first
3. **If AI fails**, tries fallback model (`gpt2`)
4. **If both fail**, uses knowledge-based system with stored recipes
5. **Always returns** personalized recipes filtered by user profile

## Model Comparison

| Model | Knowledge | Speed | Quality | Cost |
|-------|-----------|-------|---------|------|
| `EleutherAI/gpt-neo-125M` | Good | Fast | Good | FREE |
| `gpt2` | Basic | Very Fast | Basic | FREE |
| Knowledge Base | Excellent | Instant | Excellent | FREE |

## Why These Models?

1. **100% Free**: No API keys, no costs, no limits
2. **No Registration**: Works immediately
3. **Stored Knowledge**: Models have knowledge about recipes built-in
4. **Reliable**: Always returns results (fallback system)

## Future Improvements

If you want to use more advanced models:
- **OpenAI GPT-3.5/4**: Better quality but requires API key and costs money
- **Anthropic Claude**: Excellent for recipes but requires API key
- **Local Models**: Run models on your server (requires GPU)

For now, the free Hugging Face models + knowledge base provide excellent results!

