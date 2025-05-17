import numpy as np
import cv2
from tensorflow.keras.preprocessing import image
from tensorflow.keras.preprocessing.image import img_to_array

def preprocess_image(image_path):
    """
    Preprocess an image for the facial expression model
    """
    # Read image
    img = cv2.imread(image_path)
    
    # Convert to grayscale if your model was trained on grayscale images
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    
    # Detect face
    face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
    faces = face_cascade.detectMultiScale(gray, 1.3, 5)
    
    if len(faces) > 0:
        # Take the first face
        (x, y, w, h) = faces[0]
        face = gray[y:y+h, x:x+w]
    else:
        # If no face detected, use the whole image
        face = gray
    
    # Resize to match model input shape (assuming 48x48 for typical emotion models)
    face = cv2.resize(face, (48, 48))
    
    # Normalize and reshape
    face = face.astype("float") / 255.0
    face = img_to_array(face)
    face = np.expand_dims(face, axis=0)
    
    return face

def get_expression_label(prediction):
    """
    Convert model prediction to human-readable emotion label
    """
    # Map the index of the highest prediction probability to an emotion label
    # Adjust these labels according to your model's training classes
    emotion_labels = ["Angry", "Disgust", "Fear", "Happy", "Sad", "Surprise", "Neutral"]
    
    # Get the index of highest probability
    expression_idx = np.argmax(prediction[0])
    
    return emotion_labels[expression_idx]

def get_happiness_tips(expression):
    """
    Provide tips to change the expression to happy based on the current expression
    """
    tips = {
        "Angry": [
            "Take a deep breath and count to 10",
            "Think about something that makes you laugh",
            "Relax your facial muscles, especially around your eyebrows",
            "Visualize a peaceful scene"
        ],
        "Disgust": [
            "Focus on pleasant memories",
            "Shift your attention to something you find beautiful",
            "Relax your nose and mouth area",
            "Practice raising the corners of your mouth slightly"
        ],
        "Fear": [
            "Practice box breathing (4-count inhale, hold, exhale, hold)",
            "Remind yourself that you're safe",
            "Relax your widened eyes and raised eyebrows",
            "Ground yourself by naming 5 things you can see"
        ],
        "Happy": [
            "You're already showing happiness! Keep it up!",
            "Try to maintain this genuine smile",
            "Share your joy with others",
            "Take a photo to remember this happy moment"
        ],
        "Sad": [
            "Gently lift the corners of your mouth",
            "Think of a fond memory that brings you joy",
            "Listen to uplifting music",
            "Practice smiling - even a forced smile can help improve mood"
        ],
        "Surprise": [
            "Relax your raised eyebrows",
            "Close your mouth gently",
            "Take a calming breath",
            "Transition the energy of surprise into a smile"
        ],
        "Neutral": [
            "Think of something that makes you genuinely happy",
            "Gently engage your smile muscles",
            "Remember a funny joke or situation",
            "Practice 'half-smiling' technique from mindfulness"
        ]
    }
    
    return tips.get(expression, ["Focus on happy thoughts", "Practice smiling in the mirror"])