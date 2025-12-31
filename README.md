# BuyLyticsAI - Purchase Prediction Model

## Overview

BuyLyticsAI is a machine learning-powered web application that predicts whether online shoppers will make a purchase based on their browsing behavior and session characteristics. The system analyzes 17 behavioral features including page visits, duration metrics, bounce rates, and visitor patterns to provide real-time purchase intent predictions with confidence scores.

The application features a modern dark-themed web interface that supports both single-record predictions and batch processing of multiple customer sessions. Built with Flask and scikit-learn, it provides instant predictions through a REST API and an interactive dashboard for data analysis and visualization.

## Model Performance

The prediction model demonstrates strong performance across key metrics:

- **Overall Accuracy**: 88.34%
- **True Positive Rate (Sensitivity)**: 75.72%
- **True Negative Rate (Specificity)**: 90.65%

**Model Configuration:**
- Algorithm: RandomForestClassifier
- Estimators: 200 trees
- Max Depth: 10
- Min Samples Split: 5
- Class Weight: Balanced
- Random State: 42

## Required Data Format

Your input files should contain the following 17 features:

| Feature | Type | Description |
|---------|------|-------------|
| Administrative | Integer | Number of administrative pages visited |
| Administrative_Duration | Float | Time spent on administrative pages |
| Informational | Integer | Number of informational pages visited |
| Informational_Duration | Float | Time spent on informational pages |
| ProductRelated | Integer | Number of product-related pages visited |
| ProductRelated_Duration | Float | Time spent on product pages |
| BounceRates | Float | Bounce rate (0-1) |
| ExitRates | Float | Exit rate (0-1) |
| PageValues | Float | Average page value |
| SpecialDay | Float | Proximity to special day (0-1) |
| Month | String | Month abbreviation (Jan-Dec, June) |
| OperatingSystems | Integer | Operating system type |
| Browser | Integer | Browser type |
| Region | Integer | Geographic region |
| TrafficType | Integer | Traffic source type |
| VisitorType | String | "Returning_Visitor" or "New_Visitor" |
| Weekend | Boolean | True/False or TRUE/FALSE |

**Optional**: Session ID column (auto-generated if missing)

## Features

- 🔮 **ML-Powered Predictions**: Uses RandomForestClassifier to predict buyer behavior with high accuracy
- 📊 **Batch Processing**: Analyze multiple records at once with detailed statistics and summary metrics
- 📈 **Interactive Visualizations**: Real-time pie charts and confidence metrics for prediction analysis
- 📁 **Multiple File Formats**: Supports CSV and JSON file uploads for flexible data input
- 💾 **Export Results**: Download predictions as Excel or PDF reports with professional formatting

## Technologies Used

### Backend
- **Flask 3.1.2**
- **scikit-learn 1.7.0**
- **flask-cors 6.0.2**

### Frontend
- **HTML5**
- **CSS3**
- **JavaScript (ES6+)**
- **Chart.js 4.4.0**
- **XLSX.js 0.18.5**
- **jsPDF 2.5.1**
- **Chart.js Datalabels Plugin**

## How to Setup

### Prerequisites

- Python 3.8 or higher
- pip (Python package manager)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd Purchase-Prediction-Model
   ```

2. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

3. **Train the model** (if `shopping_model.pkl` is missing)
   ```bash
   python shopping.py shopping.csv
   ```
   This will train the RandomForestClassifier and save it as `shopping_model.pkl`

### Running the Application

1. **Start the Flask server**
   ```bash
   python api.py
   ```

2. **Access the web interface**
   - Open your browser and navigate to: `http://localhost:5001`
   - The interactive dashboard will be ready to use

### Quick Test

Test with example files provided in the `examples/` directory:
```bash
# Option 1: Use the web interface
# Upload examples/example_data.csv or examples/example_data.json

# Option 2: Use the API directly
python test_api.py
```

## Acknowledgements

Trained on dataset provided by [Sakar, C.O., Polat, S.O., Katircioglu, M. et al. Neural Comput & Applic (2019)](https://doi.org/10.1007/s00521-018-3523-0)