from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import pickle
from datetime import datetime
import os

app = Flask(__name__, static_folder='static')
CORS(app)

# Load the trained model
with open('shopping_model.pkl', 'rb') as f:
    model = pickle.load(f)

# Store prediction logs
prediction_logs = []


@app.route('/predict', methods=['POST'])
def predict():
    """Make predictions on new user data"""
    try:
        data = request.get_json()

        # Convert input to feature array
        features = [
            int(data['Administrative']),
            float(data['Administrative_Duration']),
            int(data['Informational']),
            float(data['Informational_Duration']),
            int(data['ProductRelated']),
            float(data['ProductRelated_Duration']),
            float(data['BounceRates']),
            float(data['ExitRates']),
            float(data['PageValues']),
            float(data['SpecialDay']),
            ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'June', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].index(data['Month']),
            int(data['OperatingSystems']),
            int(data['Browser']),
            int(data['Region']),
            int(data['TrafficType']),
            1 if data['VisitorType'] == 'Returning_Visitor' else 0,
            1 if data['Weekend'] else 0,
        ]

        # Make prediction
        prediction = model.predict([features])[0]
        probabilities = model.predict_proba([features])[0]

        # Log the prediction
        log_entry = {
            'timestamp': datetime.now().isoformat(),
            'prediction': 'Buyer' if prediction == 1 else 'Non-Buyer',
            'confidence': float(max(probabilities))
        }
        prediction_logs.append(log_entry)

        # Return response
        return jsonify({
            'prediction': 'Buyer' if prediction == 1 else 'Non-Buyer',
            'confidence': float(max(probabilities)),
            'probabilities': {
                'non_buyer': float(probabilities[0]),
                'buyer': float(probabilities[1])
            }
        })

    except Exception as e:
        return jsonify({'error': str(e)}), 400


@app.route('/stats', methods=['GET'])
def get_stats():
    """Get API statistics"""
    total = len(prediction_logs)
    buyers = sum(1 for log in prediction_logs if log['prediction'] == 'Buyer')

    return jsonify({
        'total_predictions': total,
        'buyer_predictions': buyers,
        'non_buyer_predictions': total - buyers,
        'recent_predictions': prediction_logs[-10:]
    })


@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'model_loaded': model is not None,
        'timestamp': datetime.now().isoformat()
    })


@app.route('/')
def index():
    """Serve the main UI page"""
    return send_from_directory('.', 'index.html')


if __name__ == '__main__':
    print("🚀 Shopping Prediction API Running!")
    print("📊 Endpoints:")
    print("   POST /predict - Make predictions")
    print("   GET /stats - View statistics")
    print("   GET /health - Health check")
    app.run(debug=True, host='0.0.0.0', port=5001)