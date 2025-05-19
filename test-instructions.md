# Testing Instructions

1. Open the application at http://localhost:5000
2. Click on "Select an eye conjunctiva image" and choose any image file from your computer
3. The image will be displayed in the preview area
4. Click on "Upload and Scan" button
5. Wait for the processing to complete
6. You will see the scan result (either "ANEMIA DETECTED" or "NO ANEMIA DETECTED")
7. The full API response will be displayed below the result

## Expected Behavior
- The image should be uploaded successfully
- The scan result should be displayed (randomly true or false due to the mock model)
- The scan data should be stored in the PostgreSQL database

## Troubleshooting
If you encounter any issues:
1. Make sure PostgreSQL is running and accessible with the provided credentials
2. Check the server console for any error messages
3. Ensure the images/scans directory exists and is writable
