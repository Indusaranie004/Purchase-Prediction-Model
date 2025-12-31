import requests
import json

API_URL = "http://localhost:5001"


def test_health():
    """Test health check endpoint"""
    print("🏥 Testing health check...")

    response = requests.get(f"{API_URL}/health")

    if response.status_code == 200:
        health = response.json()
        print(f"✅ API is {health['status']}")
        print(f"   Model loaded: {health['model_loaded']}")
    else:
        print(f"❌ Error: {response.json()}")


def test_prediction():
    """Test prediction endpoint"""

    sample_data = {
        "Administrative": 0,
        "Administrative_Duration": 0.0,
        "Informational": 0,
        "Informational_Duration": 0.0,
        "ProductRelated": 5,
        "ProductRelated_Duration": 150.5,
        "BounceRates": 0.02,
        "ExitRates": 0.05,
        "PageValues": 25.5,
        "SpecialDay": 0.0,
        "Month": "Nov",
        "OperatingSystems": 2,
        "Browser": 2,
        "Region": 1,
        "TrafficType": 2,
        "VisitorType": "Returning_Visitor",
        "Weekend": False
    }

    print("\n🧪 Testing prediction endpoint...")
    print(f"Input: {json.dumps(sample_data, indent=2)}")

    response = requests.post(f"{API_URL}/predict", json=sample_data)

    if response.status_code == 200:
        result = response.json()
        print(f"\n✅ Prediction: {result['prediction']}")
        print(f"   Confidence: {result['confidence']:.2%}")
        print(f"   Probabilities:")
        print(f"      Buyer: {result['probabilities']['buyer']:.2%}")
        print(f"      Non-Buyer: {result['probabilities']['non_buyer']:.2%}")
    else:
        print(f"❌ Error: {response.json()}")


def test_stats():
    """Test stats endpoint"""
    print("\n📊 Testing stats endpoint...")

    response = requests.get(f"{API_URL}/stats")

    if response.status_code == 200:
        stats = response.json()
        print(f"✅ Stats retrieved!")
        print(f"   Total predictions: {stats['total_predictions']}")
        print(f"   Buyer predictions: {stats['buyer_predictions']}")
        print(f"   Non-buyer predictions: {stats['non_buyer_predictions']}")
    else:
        print(f"❌ Error: {response.json()}")


if __name__ == "__main__":
    print("=" * 50)
    print("Shopping Prediction API Test Suite")
    print("=" * 50)

    # Run all tests
    test_health()
    test_prediction()
    test_stats()

    print("\n" + "=" * 50)
    print("✅ All tests completed!")
    print("=" * 50)