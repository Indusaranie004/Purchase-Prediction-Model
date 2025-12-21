import csv
import sys

from sklearn.model_selection import train_test_split
from sklearn.neighbors import KNeighborsClassifier

TEST_SIZE = 0.4


def main():

    # Check command-line arguments
    if len(sys.argv) != 2:
        sys.exit("Usage: python shopping.py data")

    # Load data from spreadsheet and split into train and test sets
    evidence, labels = load_data(sys.argv[1])
    X_train, X_test, y_train, y_test = train_test_split(
        evidence, labels, test_size=TEST_SIZE
    )

    # Train model and make predictions
    model = train_model(X_train, y_train)
    predictions = model.predict(X_test)
    sensitivity, specificity = evaluate(y_test, predictions)

    # Print results
    print(f"Correct: {(y_test == predictions).sum()}")
    print(f"Incorrect: {(y_test != predictions).sum()}")
    print(f"True Positive Rate: {100 * sensitivity:.2f}%")
    print(f"True Negative Rate: {100 * specificity:.2f}%")


def load_data(filename):

    evidence = []
    labels = []

    with open(filename, 'r') as file:
        reader = csv.DictReader(file)
        for row in reader:

            evidence_row = [

                int(row['Administrative']),
                float(row['Administrative_Duration']),
                int(row['Informational']),
                float(row['Informational_Duration']),
                int(row['ProductRelated']),
                float(row['ProductRelated_Duration']),
                float(row['BounceRates']),
                float(row['ExitRates']),
                float(row['PageValues']),
                float(row['SpecialDay']),
                ['Jan','Feb','Mar','Apr','May','June','Jul','Aug','Sep','Oct','Nov','Dec'].index(row['Month']),
                int(row['OperatingSystems']),
                int(row['Browser']),
                int(row['Region']),
                int(row['TrafficType']),
                1 if row['VisitorType'] == 'Returning_Visitor' else 0,
                1 if row['Weekend'] == 'TRUE' else 0,
            ]
            evidence.append(evidence_row)
            labels.append(1 if row['Revenue'] == 'TRUE' else 0)

    return (evidence, labels)


def train_model(evidence, labels):

   model = KNeighborsClassifier(n_neighbors=1)
   model.fit(evidence, labels)
   return model


def evaluate(labels, predictions):

    true_positives = sum(1 for i in range(len(labels)) if labels[i] == 1 and predictions[i] == 1)
    false_negatives = sum(1 for i in range(len(labels)) if labels[i] == 1 and predictions[i] == 0)
    true_negatives = sum(1 for i in range(len(labels)) if labels[i] == 0 and predictions[i] == 0)
    false_positives = sum(1 for i in range(len(labels)) if labels[i] == 0 and predictions[i] == 1)

    sensitivity = true_positives / (true_positives + false_negatives)
    specificity = true_negatives / (true_negatives + false_positives)

    return sensitivity, specificity


if __name__ == "__main__":
    main()
