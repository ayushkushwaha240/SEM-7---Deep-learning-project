from fastapi import FastAPI, File, UploadFile, Form
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from transformers import BlipProcessor, BlipForConditionalGeneration, GPT2Tokenizer, GPT2LMHeadModel
from PIL import Image
import io
import requests

# Initialize FastAPI
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins
    allow_credentials=True,
    allow_methods=["*"],  # Allow all HTTP methods
    allow_headers=["*"],  # Allow all headers
)

# Load BLIP (caption model) and GPT-2 (story model)
caption_processor = BlipProcessor.from_pretrained("Salesforce/blip-image-captioning-base")
caption_model = BlipForConditionalGeneration.from_pretrained("Salesforce/blip-image-captioning-base")
story_tokenizer = GPT2Tokenizer.from_pretrained("gpt2")
story_model = GPT2LMHeadModel.from_pretrained("gpt2")
story_tokenizer.pad_token = story_tokenizer.eos_token  # Set padding token for GPT-2


@app.post("/generate/")
async def generate(image_url: str = Form(...), mode: str = Form(...)):
    """
    Generate a caption or story based on an image URL.
    :param image_url: URL of the image
    :param mode: 'caption' or 'story' (toggle from the extension)
    """
    try:
        # Download the image from the URL
        response = requests.get(image_url)
        response.raise_for_status()  # Raise an error if the request fails
        image_data = response.content
        pil_image = Image.open(io.BytesIO(image_data))

        # Generate a caption using BLIP
        inputs = caption_processor(pil_image, return_tensors="pt")
        caption_ids = caption_model.generate(**inputs)
        caption = caption_processor.decode(caption_ids[0], skip_special_tokens=True)

        if mode == "caption":
            # Return only the caption
            return JSONResponse({"result": caption})

        elif mode == "story":
            # Generate a story based on the caption
            prompt = f"Based on the following description, write a detailed and imaginative story with a realistic view: {caption}"
            inputs = story_tokenizer(prompt, return_tensors="pt", padding=True, truncation=True)
            story_output = story_model.generate(
                inputs.input_ids,
                attention_mask=inputs.attention_mask,
                max_new_tokens=500,
                temperature=0.7,
                top_p=0.9,
                num_return_sequences=1,
                no_repeat_ngram_size=2,
                pad_token_id=story_tokenizer.pad_token_id,
            )
            story = story_tokenizer.decode(story_output[0], skip_special_tokens=True)
            return JSONResponse({"result": story})

        else:
            return JSONResponse({"error": "Invalid mode. Use 'caption' or 'story'."}, status_code=400)

    except requests.exceptions.RequestException as e:
        return JSONResponse({"error": f"Image download failed: {str(e)}"}, status_code=400)
    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)
