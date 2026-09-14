#!/usr/bin/env python3
"""
Disaster Image Classification using Google Gemini Pro Vision API
This script analyzes disaster images and classifies their priority level.
"""

import google.generativeai as genai
from PIL import Image
import os
import sys


def load_api_key():
    """
    Securely load the Gemini API key from environment variable.
    Returns the API key or exits if not found.
    """
    api_key = os.getenv('GEMINI_API_KEY')
    if not api_key:
        print("ERROR: GEMINI_API_KEY environment variable is not set!")
        print("Please set the environment variable before running this script.")
        print("Example: set GEMINI_API_KEY=your_api_key_here")
        sys.exit(1)
    return api_key


def load_image(image_path):
    """
    Load an image from the specified file path using PIL.
    Returns the loaded image or None if file not found.
    """
    try:
        image = Image.open(image_path)
        print(f"✅ Successfully loaded image: {image_path}")
        print(f"Image size: {image.size}, Format: {image.format}")
        return image
    except FileNotFoundError:
        print(f"❌ ERROR: Image file not found at path: {image_path}")
        print("Please check the file path and ensure the image exists.")
        return None
    except Exception as e:
        print(f"❌ ERROR: Failed to load image: {str(e)}")
        return None


def initialize_gemini_model(api_key):
    """
    Initialize the Gemini Pro Vision model with the provided API key.
    Returns the configured model.
    """
    try:
        # Configure the API key
        genai.configure(api_key=api_key)
        
        # Initialize the gemini-pro-vision model
        model = genai.GenerativeModel('gemini-pro-vision')
        print("✅ Gemini Pro Vision model initialized successfully")
        return model
    except Exception as e:
        print(f"❌ ERROR: Failed to initialize Gemini model: {str(e)}")
        sys.exit(1)


def classify_disaster_image(model, image):
    """
    Classify the disaster image using Gemini Pro Vision API.
    Returns the priority classification.
    """
    
    # Exact prompt as specified in requirements
    prompt = """Analyze the attached image of a disaster scene and classify its priority as High, Medium, or Low based on the following criteria. Provide only the single-word priority level as your response.

- High Priority: Immediate threat to human life (e.g., active fires with people nearby, collapsing buildings, visibly injured or trapped individuals, severe flooding with people in danger).
- Medium Priority: Significant property/infrastructure damage but no immediate visible threat to life (e.g., flooded empty streets, damaged but stable structures).
- Low Priority: The situation is contained or damage is minor (e.g., a fallen tree on a road, minor localized flooding, aftermath of a resolved incident)."""

    try:
        print("🤖 Analyzing disaster image with Gemini Pro Vision...")
        
        # Call the model with both text prompt and image
        response = model.generate_content([prompt, image])
        
        # Extract the classification from response
        classification = response.text.strip()
        
        print("✅ Analysis completed successfully")
        return classification
        
    except Exception as e:
        print(f"❌ ERROR: Failed to analyze image: {str(e)}")
        return None


def main():
    """
    Main function to orchestrate the disaster image classification process.
    """
    print("🚨 Disaster Image Classification System")
    print("=" * 50)
    
    # Step 1: Load API key securely
    print("🔑 Loading API key from environment variable...")
    api_key = load_api_key()
    
    # Step 2: Initialize Gemini model
    print("🤖 Initializing Gemini Pro Vision model...")
    model = initialize_gemini_model(api_key)
    
    # Step 3: Load image (placeholder path - replace with actual image path)
    image_path = 'path_to_your_image.jpg'  # Replace with actual image path
    print(f"📸 Loading image from: {image_path}")
    image = load_image(image_path)
    
    if image is None:
        print("❌ Cannot proceed without a valid image. Exiting...")
        sys.exit(1)
    
    # Step 4: Classify the disaster image
    print("🔍 Starting disaster classification...")
    classification = classify_disaster_image(model, image)
    
    if classification:
        # Step 5: Display results in user-friendly format
        print("\n" + "=" * 50)
        print(f"🎯 Disaster Priority: {classification}")
        print("=" * 50)
        
        # Additional formatting based on priority level
        if classification.upper() == "HIGH":
            print("🚨 HIGH PRIORITY - Immediate emergency response required!")
        elif classification.upper() == "MEDIUM":
            print("⚠️ MEDIUM PRIORITY - Significant attention needed")
        elif classification.upper() == "LOW":
            print("ℹ️ LOW PRIORITY - Situation is manageable")
        
    else:
        print("❌ Classification failed. Please try again.")


def set_environment_variable():
    """
    Helper function to set the environment variable.
    """
    api_key = os.getenv('GEMINI_API_KEY')
    if api_key:
        os.environ['GEMINI_API_KEY'] = api_key
        print("✅ Environment variable GEMINI_API_KEY is active")
    else:
        print("⚠️ Please set GEMINI_API_KEY environment variable")


if __name__ == "__main__":
    # Uncomment the line below to set the API key for testing
    # set_environment_variable()
    
    main()