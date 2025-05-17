from flask import Flask, render_template, request, jsonify, Response
import os
import numpy as np
import tensorflow as tf
from tensorflow.keras.models import load_model
import cv2
import time
from utils.model_helper import preprocess_image, get_expression_label, get_happiness_tips

def check_model_file(model_path):
    """Check if model file exists and is accessible"""
    if not os.path.exists(model_path):
        print(f"ERROR: Model file not found at {model_path}")
        print(f"Current working directory: {os.getcwd()}")
        parent_dir = os.path.dirname(model_path)
        if os.path.exists(parent_dir):
            print(f"Files in {parent_dir}: {os.listdir(parent_dir)}")
        else:
            print(f"Directory {parent_dir} does not exist")
        return False
    
    if not os.access(model_path, os.R_OK):
        print(f"ERROR: Model file exists but is not readable at {model_path}")
        return False
    
    return True

app = Flask(__name__)

# Configure upload folder
UPLOAD_FOLDER = 'static/uploads'
if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

# Ensure models directory exists
MODELS_FOLDER = 'models'
if not os.path.exists(MODELS_FOLDER):
    os.makedirs(MODELS_FOLDER)
    print(f"Created models directory at: {os.path.abspath(MODELS_FOLDER)}")

# Load model
try:
    # Check actual filename in the models directory
    models_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'models')
    if os.path.exists(models_dir):
        files = os.listdir(models_dir)
        model_file = None
        for file in files:
            if file.startswith('model_checkpoint.h5'):
                model_file = file
                break
        
        if model_file:
            MODEL_PATH = os.path.join(models_dir, model_file)
            print(f"Found model at: {MODEL_PATH}")
            model = load_model(MODEL_PATH)
            print("Model loaded successfully!")
        else:
            print(f"ERROR: No model file starting with 'model_checkpoint.h5' found in {models_dir}")
            print(f"Files in models directory: {files}")
            raise FileNotFoundError(f"Model file not found in {models_dir}")
    else:
        print(f"ERROR: Models directory not found at {models_dir}")
        raise FileNotFoundError(f"Models directory not found at {models_dir}")
except Exception as e:
    print(f"Error loading model: {e}")
    import sys
    sys.exit(1)  # Exit if model can't be loaded

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/predict', methods=['POST'])
def predict():
    if 'file' not in request.files:
        return jsonify({'error': 'No file part'})
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No selected file'})
    
    # Save the file
    filename = os.path.join(app.config['UPLOAD_FOLDER'], file.filename)
    file.save(filename)
    
    # Preprocess the image for the model
    processed_image = preprocess_image(filename)
    
    # Make prediction
    prediction = model.predict(processed_image)
    expression = get_expression_label(prediction)
    
    # Get tips based on the predicted expression
    tips = get_happiness_tips(expression)
    
    return jsonify({
        'expression': expression,
        'tips': tips,
        'image_path': filename
    })

@app.route('/video_feed')
def video_feed():
    """Route for streaming video from the webcam"""
    return Response(generate_frames(), 
                    mimetype='multipart/x-mixed-replace; boundary=frame')

def generate_frames():
    """Generate camera frames with processing"""
    # Open the camera
    camera = cv2.VideoCapture(0)
    
    # Setup for face detection
    face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
    
    # Allow camera to warm up
    time.sleep(0.5)
    
    while True:
        success, frame = camera.read()
        if not success:
            break
        
        # Convert to grayscale for face detection
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        
        # Detect faces
        faces = face_cascade.detectMultiScale(gray, 1.3, 5)
        
        # Draw rectangle around faces
        for (x, y, w, h) in faces:
            cv2.rectangle(frame, (x, y), (x+w, y+h), (0, 255, 0), 2)
        
        # Encode the frame to jpg format
        ret, buffer = cv2.imencode('.jpg', frame)
        frame = buffer.tobytes()
        
        yield (b'--frame\r\n'
               b'Content-Type: image/jpeg\r\n\r\n' + frame + b'\r\n')
    
    camera.release()

@app.route('/analyze_webcam', methods=['POST'])
def analyze_webcam():
    """API endpoint to analyze a frame from the webcam"""
    # Get frame from request
    image_data = request.json.get('image_data', '')
    if not image_data:
        return jsonify({'error': 'No image data provided'})
    
    # Remove data URL prefix if present
    if 'base64,' in image_data:
        image_data = image_data.split('base64,')[1]
    
    # Convert base64 to image
    import base64
    from io import BytesIO
    from PIL import Image
    
    image_bytes = base64.b64decode(image_data)
    image = Image.open(BytesIO(image_bytes))
    
    # Save temporarily and process
    temp_path = os.path.join(app.config['UPLOAD_FOLDER'], 'webcam_capture.jpg')
    image.save(temp_path)
    
    # Process image for prediction
    processed_image = preprocess_image(temp_path)
    
    # Make prediction
    prediction = model.predict(processed_image)
    expression = get_expression_label(prediction)
    
    # Get tips
    tips = get_happiness_tips(expression)
    
    return jsonify({
        'expression': expression,
        'tips': tips
    })

if __name__ == '__main__':
    app.run(debug=True)