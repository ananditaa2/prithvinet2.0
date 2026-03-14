"""
Fix Jindal Raigarh PM10 value for demo
"""
import json

# Load the emission logs
with open('src/data/json/emission_logs_raigarh.json', 'r') as f:
    data = json.load(f)

print(f"Total entries: {len(data)}")

# Find entries for Administrative Building, Jindal with PM10 around 83.7
found = []
for i, entry in enumerate(data):
    station = entry.get('station_name', '')
    pm10 = entry.get('pollutants', {}).get('PM10', 0)
    
    if 'Administrative Building, Jindal' in station and abs(pm10 - 83.7) < 1:
        found.append((i, entry))
        print(f"\nFound entry at index {i}:")
        print(f"  Station: {station}")
        print(f"  PM10: {pm10}")
        print(f"  AQI: {entry.get('AQI')}")
        print(f"  Compliance: {entry.get('compliance_status')}")
        print(f"  Timestamp: {entry.get('timestamp')}")

print(f"\nTotal matches: {len(found)}")

# Update the PM10 value to 104.2 and fix compliance status
for i, entry in found:
    old_pm10 = entry['pollutants']['PM10']
    entry['pollutants']['PM10'] = 104.2
    entry['compliance_status'] = 'VIOLATION'
    entry['AQI_category'] = 'MODERATE'
    entry['violations'] = ['PM10']
    if entry.get('AQI') and entry['AQI'] < 100:
        entry['AQI'] = 104  # Update AQI to reflect violation
    print(f"Updated entry {i}: PM10 {old_pm10} -> 104.2, compliance -> VIOLATION")

# Save back
with open('src/data/json/emission_logs_raigarh.json', 'w') as f:
    json.dump(data, f, indent=2)

print("\n✅ File updated successfully!")
