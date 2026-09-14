#!/usr/bin/env python3
"""
Integrated Disaster Image Classifier for Flutter App
This script integrates with your Civic Resolve app to classify disaster images
when they are attached in the report details page.
"""

import google.generativeai as genai
from PIL import Image
import os
import sys
import json
import argparse


class DisasterImageClassifier:
    """
    A class to handle disaster image classification using Gemini Pro Vision API.
    """
    
    def __init__(self):
        """Initialize the classifier with API key and model."""
        self.api_key = self._load_api_key()
        self.model = self._initialize_model()
    
    def _load_api_key(self):
        """Load API key from environment variable."""
        api_key = os.getenv('GEMINI_API_KEY')
        if not api_key:
            print("⚠️ GEMINI_API_KEY environment variable not set.")
        else:
            print("✅ Using API key from environment variable")
        return api_key
    
    def _initialize_model(self):
        """Initialize Gemini Pro Vision model."""
        try:
            genai.configure(api_key=self.api_key)
            model = genai.GenerativeModel('gemini-pro-vision')
            print("✅ Gemini Pro Vision model initialized")
            return model
        except Exception as e:
            print(f"❌ Model initialization failed: {str(e)}")
            sys.exit(1)
    
    def classify_image(self, image_path, output_format='json'):
        """
        Classify a disaster image and return priority level.
        
        Args:
            image_path (str): Path to the image file
            output_format (str): 'json' or 'text' for output format
        
        Returns:
            dict or str: Classification result
        """
        
        # Load image
        try:
            image = Image.open(image_path)
            print(f"📸 Loaded image: {image_path}")
        except FileNotFoundError:
            error_msg = f"Image file not found: {image_path}"
            if output_format == 'json':
                return {"error": error_msg, "priority": "Unknown"}
            return error_msg
        except Exception as e:
            error_msg = f"Error loading image: {str(e)}"
            if output_format == 'json':
                return {"error": error_msg, "priority": "Unknown"}
            return error_msg
        
        # Classification prompt (as specified in requirements)
        prompt = """Analyze the attached image of a disaster scene and classify its priority as High, Medium, or Low based on the following criteria. Provide only the single-word priority level as your response.

- High Priority: Immediate threat to human life (e.g., active fires with people nearby, collapsing buildings, visibly injured or trapped individuals, severe flooding with people in danger).
- Medium Priority: Significant property/infrastructure damage but no immediate visible threat to life (e.g., flooded empty streets, damaged but stable structures).
- Low Priority: The situation is contained or damage is minor (e.g., a fallen tree on a road, minor localized flooding, aftermath of a resolved incident)."""
        
        try:
            print("🤖 Analyzing with Gemini Pro Vision...")
            
            # Generate content with image and prompt
            response = self.model.generate_content([prompt, image])
            priority = response.text.strip()
            
            print(f"✅ Classification complete: {priority}")
            
            if output_format == 'json':
                return {
                    "priority": priority,
                    "confidence": "High",
                    "model": "gemini-pro-vision",
                    "timestamp": self._get_timestamp(),
                    "image_path": image_path
                }
            else:
                return f"Disaster Priority: {priority}"
                
        except Exception as e:
            error_msg = f"Classification failed: {str(e)}"
            if output_format == 'json':
                return {"error": error_msg, "priority": "Medium"}
            return error_msg
    
    def _get_timestamp(self):
        """Get current timestamp."""
        from datetime import datetime
        return datetime.now().isoformat()


def main():
    """Main function for command line usage."""
    parser = argparse.ArgumentParser(description='Classify disaster images using Gemini Pro Vision')
    parser.add_argument('image_path', help='Path to the disaster image')
    parser.add_argument('--format', choices=['json', 'text'], default='text', 
                       help='Output format (default: text)')
    
    args = parser.parse_args()
    
    # Initialize classifier
    classifier = DisasterImageClassifier()
    
    # Classify image
    result = classifier.classify_image(args.image_path, args.format)
    
    if args.format == 'json':
        print(json.dumps(result, indent=2))
    else:
        print(result)


def classify_disaster_for_flutter(image_path):
    """
    Simple function that can be called from Flutter/Dart via process execution.
    Returns JSON result for easy parsing.
    """
    try:
        classifier = DisasterImageClassifier()
        result = classifier.classify_image(image_path, 'json')
        return json.dumps(result)
    except Exception as e:
        return json.dumps({"error": str(e), "priority": "Medium"})


if __name__ == "__main__":
    # Check if called with specific image path as argument
    if len(sys.argv) > 1:
        if sys.argv[1] == '--test':
            # Test mode with sample path
            print("🧪 Test Mode - Replace 'path_to_your_image.jpg' with actual image path")
            test_path = "path_to_your_image.jpg"
            classifier = DisasterImageClassifier()
            result = classifier.classify_image(test_path)
            print(result)
        else:
            main()
    else:
        print("🚨 Disaster Image Classification System")
        print("=" * 50)
        print("Usage:")
        print("  python disaster_classifier.py <image_path>")
        print("  python disaster_classifier.py <image_path> --format json")
        print("  python disaster_classifier.py --test")
        print("\nExample:")
        print("  python disaster_classifier.py flood_image.jpg")
        print("  python disaster_classifier.py disaster.png --format json")