#!/usr/bin/env python3
"""
Comprehensive Backend API Test for Terrarium Plant Compatibility API
Tests all endpoints as specified in the review request
"""

import requests
import json
import sys
import time
from urllib.parse import quote

# Get the backend URL from frontend env
def get_backend_url():
    try:
        with open('/app/frontend/.env', 'r') as f:
            for line in f:
                if line.startswith('EXPO_PUBLIC_BACKEND_URL='):
                    base_url = line.strip().split('=')[1]
                    return f"{base_url}/api"
        return "https://terrarium-builder-1.preview.emergentagent.com/api"  # fallback
    except:
        return "https://terrarium-builder-1.preview.emergentagent.com/api"  # fallback

BASE_URL = get_backend_url()

def test_endpoint(method, endpoint, description, expected_status=200, **kwargs):
    """Test a single API endpoint"""
    print(f"\n{'='*60}")
    print(f"Testing: {description}")
    print(f"URL: {method} {BASE_URL}{endpoint}")
    
    try:
        if method == "GET":
            response = requests.get(f"{BASE_URL}{endpoint}", timeout=30, **kwargs)
        elif method == "POST":
            response = requests.post(f"{BASE_URL}{endpoint}", timeout=30, **kwargs)
        
        print(f"Status Code: {response.status_code}")
        
        if response.status_code != expected_status:
            print(f"❌ FAIL: Expected {expected_status}, got {response.status_code}")
            print(f"Response: {response.text[:500]}...")
            return False
        
        # Try to parse JSON
        try:
            data = response.json()
            print(f"✅ SUCCESS: Valid JSON response")
            return data
        except json.JSONDecodeError:
            print(f"❌ FAIL: Invalid JSON response")
            print(f"Response: {response.text[:200]}...")
            return False
            
    except requests.exceptions.RequestException as e:
        print(f"❌ FAIL: Request failed - {str(e)}")
        return False
    except Exception as e:
        print(f"❌ FAIL: Unexpected error - {str(e)}")
        return False

def main():
    print("=" * 60)
    print("TERRARIUM PLANT COMPATIBILITY API - BACKEND TESTING")
    print("=" * 60)
    print(f"Base URL: {BASE_URL}")
    
    # Track test results
    results = {
        "total_tests": 0,
        "passed": 0,
        "failed": 0,
        "details": []
    }
    
    # Test 1: Health Check
    print(f"\n🏥 TEST 1: Health Check")
    health_data = test_endpoint("GET", "/health", "API Health Check")
    results["total_tests"] += 1
    
    if health_data:
        results["passed"] += 1
        print(f"✅ Health check data: {health_data}")
        if 'plants_count' in health_data:
            plants_count = health_data['plants_count']
            print(f"📊 Plants in database: {plants_count}")
            if plants_count == 77:
                print("✅ Expected 77 plants found!")
            else:
                print(f"⚠️  Expected 77 plants, found {plants_count}")
        results["details"].append({
            "test": "Health Check",
            "status": "PASS", 
            "data": health_data
        })
    else:
        results["failed"] += 1
        results["details"].append({
            "test": "Health Check",
            "status": "FAIL",
            "error": "Health endpoint failed"
        })
    
    # Test 2: Get Groups
    print(f"\n🏷️  TEST 2: Get Plant Groups")
    groups_data = test_endpoint("GET", "/groups", "Get all plant groups")
    results["total_tests"] += 1
    
    if groups_data:
        results["passed"] += 1
        print(f"✅ Groups data: {groups_data}")
        if 'groups' in groups_data:
            groups_count = len(groups_data['groups'])
            print(f"📊 Groups found: {groups_count}")
            if groups_count == 7:
                print("✅ Expected 7 groups found!")
                # Check for Hungarian translations
                sample_groups = [g['name'] for g in groups_data['groups'][:3]]
                print(f"📝 Sample group names: {sample_groups}")
            else:
                print(f"⚠️  Expected 7 groups, found {groups_count}")
        results["details"].append({
            "test": "Get Groups",
            "status": "PASS",
            "data": groups_data
        })
    else:
        results["failed"] += 1
        results["details"].append({
            "test": "Get Groups", 
            "status": "FAIL",
            "error": "Groups endpoint failed"
        })
    
    # Test 3: Get All Plants
    print(f"\n🌱 TEST 3: Get All Plants")
    plants_data = test_endpoint("GET", "/plants", "Get all plants")
    results["total_tests"] += 1
    
    if plants_data:
        results["passed"] += 1
        print(f"✅ Plants list retrieved")
        if 'plants' in plants_data and 'total' in plants_data:
            total_plants = plants_data['total']
            print(f"📊 Total plants: {total_plants}")
            if total_plants == 77:
                print("✅ Expected 77 plants found!")
            else:
                print(f"⚠️  Expected 77 plants, found {total_plants}")
            
            # Check structure of first plant
            if plants_data['plants']:
                first_plant = plants_data['plants'][0]
                print(f"📝 First plant structure: {list(first_plant.keys())}")
                
                # Check for Z, F, N fields
                has_zfn = all(field in first_plant for field in ['Z', 'F', 'N'])
                if has_zfn:
                    print(f"✅ Z, F, N fields present: Z={first_plant.get('Z')}, F={first_plant.get('F')}, N={first_plant.get('N')}")
                else:
                    print("❌ Missing Z, F, N terrarium compatibility fields")
        
        results["details"].append({
            "test": "Get All Plants",
            "status": "PASS",
            "data": {"total": plants_data.get('total', 0)}
        })
    else:
        results["failed"] += 1
        results["details"].append({
            "test": "Get All Plants",
            "status": "FAIL", 
            "error": "Plants endpoint failed"
        })
    
    # Test 4: Filter by Group (Carnivorous)
    print(f"\n🦷 TEST 4: Filter Plants by Group - Carnivorous")
    carnivorous_data = test_endpoint("GET", "/plants?group=Carnivorous", "Filter by carnivorous group")
    results["total_tests"] += 1
    
    if carnivorous_data:
        results["passed"] += 1
        print(f"✅ Carnivorous plants retrieved")
        if 'plants' in carnivorous_data:
            carnivorous_count = len(carnivorous_data['plants'])
            print(f"📊 Carnivorous plants found: {carnivorous_count}")
            if carnivorous_count > 0:
                print(f"📝 First carnivorous plant: {carnivorous_data['plants'][0].get('name', 'Unknown')}")
            else:
                print("❌ No carnivorous plants found")
        results["details"].append({
            "test": "Filter by Carnivorous Group", 
            "status": "PASS",
            "data": {"count": len(carnivorous_data.get('plants', []))}
        })
    else:
        results["failed"] += 1
        results["details"].append({
            "test": "Filter by Carnivorous Group",
            "status": "FAIL",
            "error": "Carnivorous filter failed"
        })
    
    # Test 5: Filter by Terrarium Type (zart/closed)
    print(f"\n🏺 TEST 5: Filter by Terrarium Type - Zart (Closed)")
    zart_data = test_endpoint("GET", "/plants?terrarium_type=zart", "Filter by closed terrarium type")
    results["total_tests"] += 1
    
    if zart_data:
        results["passed"] += 1
        print(f"✅ Zart terrarium plants retrieved")
        if 'plants' in zart_data:
            zart_count = len(zart_data['plants'])
            print(f"📊 Zart terrarium plants found: {zart_count}")
            if zart_count > 0:
                # Check Z field values
                sample_plant = zart_data['plants'][0]
                z_value = sample_plant.get('Z', 'Unknown')
                print(f"📝 Sample Z value: {z_value} (should be ✓ or ~)")
        results["details"].append({
            "test": "Filter by Zart Terrarium",
            "status": "PASS", 
            "data": {"count": len(zart_data.get('plants', []))}
        })
    else:
        results["failed"] += 1
        results["details"].append({
            "test": "Filter by Zart Terrarium",
            "status": "FAIL",
            "error": "Zart terrarium filter failed"
        })
    
    # Test 6: Search by Plant Name (Drosera)
    print(f"\n🔍 TEST 6: Search by Plant Name - Drosera")
    search_data = test_endpoint("GET", "/plants?search=Drosera", "Search for Drosera plants")
    results["total_tests"] += 1
    
    if search_data:
        results["passed"] += 1
        print(f"✅ Search results retrieved")
        if 'plants' in search_data:
            search_count = len(search_data['plants'])
            print(f"📊 Drosera plants found: {search_count}")
            if search_count > 0:
                drosera_names = [p.get('name', 'Unknown') for p in search_data['plants'][:3]]
                print(f"📝 Found Drosera plants: {drosera_names}")
        results["details"].append({
            "test": "Search Drosera Plants",
            "status": "PASS",
            "data": {"count": len(search_data.get('plants', []))}
        })
    else:
        results["failed"] += 1
        results["details"].append({
            "test": "Search Drosera Plants", 
            "status": "FAIL",
            "error": "Drosera search failed"
        })
    
    # Test 7: Get Plant Detail (Drosera capensis)
    print(f"\n🌿 TEST 7: Get Plant Detail - Drosera capensis")
    plant_name = quote("Drosera capensis")
    detail_data = test_endpoint("GET", f"/plants/{plant_name}", "Get Drosera capensis details")
    results["total_tests"] += 1
    
    if detail_data:
        results["passed"] += 1
        print(f"✅ Plant detail retrieved")
        print(f"📝 Plant name: {detail_data.get('name', 'Unknown')}")
        print(f"📝 Common name: {detail_data.get('common', 'Unknown')}")
        print(f"📝 Group: {detail_data.get('group', 'Unknown')}")
        
        # Check for base64 image
        has_image = 'image_base64' in detail_data
        if has_image:
            image_data = detail_data['image_base64']
            if image_data and image_data.startswith('data:image'):
                print(f"✅ Base64 image present: {len(image_data)} characters")
            else:
                print(f"⚠️  Image field present but no valid data")
        else:
            print(f"❌ No image_base64 field found")
        
        results["details"].append({
            "test": "Get Plant Detail",
            "status": "PASS",
            "data": {"name": detail_data.get('name'), "has_image": has_image}
        })
    else:
        results["failed"] += 1
        results["details"].append({
            "test": "Get Plant Detail",
            "status": "FAIL",
            "error": "Plant detail retrieval failed"
        })
    
    # Test 8: Get Compatible Plants (Drosera capensis)
    print(f"\n🤝 TEST 8: Get Compatible Plants - Drosera capensis")
    compatible_data = test_endpoint("GET", f"/plants/{plant_name}/compatible", "Get compatible plants for Drosera capensis")
    results["total_tests"] += 1
    
    if compatible_data:
        results["passed"] += 1
        print(f"✅ Compatible plants retrieved")
        if 'compatible_plants' in compatible_data:
            compatible_count = len(compatible_data['compatible_plants'])
            print(f"📊 Compatible plants found: {compatible_count}")
            
            if compatible_count > 0:
                # Check compatibility scores
                first_compatible = compatible_data['compatible_plants'][0]
                score = first_compatible.get('compatibility_score', 'Unknown')
                print(f"📝 Top compatible plant: {first_compatible.get('name', 'Unknown')} (score: {score})")
                
                # Check if all have compatibility scores
                all_have_scores = all('compatibility_score' in p for p in compatible_data['compatible_plants'])
                if all_have_scores:
                    print("✅ All compatible plants have compatibility_score field")
                else:
                    print("❌ Some plants missing compatibility_score field")
        
        results["details"].append({
            "test": "Get Compatible Plants",
            "status": "PASS",
            "data": {"count": len(compatible_data.get('compatible_plants', []))}
        })
    else:
        results["failed"] += 1
        results["details"].append({
            "test": "Get Compatible Plants",
            "status": "FAIL", 
            "error": "Compatible plants retrieval failed"
        })
    
    # Test 9: Filter Compatible Plants by Terrarium Type
    print(f"\n🏺🤝 TEST 9: Filter Compatible Plants by Terrarium Type - Zart")
    filtered_compatible_data = test_endpoint("GET", f"/plants/{plant_name}/compatible?terrarium_type=zart", 
                                           "Get compatible plants filtered by zart terrarium")
    results["total_tests"] += 1
    
    if filtered_compatible_data:
        results["passed"] += 1
        print(f"✅ Filtered compatible plants retrieved")
        if 'compatible_plants' in filtered_compatible_data:
            filtered_count = len(filtered_compatible_data['compatible_plants'])
            print(f"📊 Zart-compatible plants found: {filtered_count}")
            
            if filtered_count > 0:
                # Check that all returned plants are zart-compatible
                sample_plant = filtered_compatible_data['compatible_plants'][0]
                z_value = sample_plant.get('Z', 'Unknown')
                print(f"📝 Sample Z value: {z_value} (should be ✓ or ~)")
        
        results["details"].append({
            "test": "Filter Compatible by Terrarium",
            "status": "PASS",
            "data": {"count": len(filtered_compatible_data.get('compatible_plants', []))}
        })
    else:
        results["failed"] += 1
        results["details"].append({
            "test": "Filter Compatible by Terrarium", 
            "status": "FAIL",
            "error": "Filtered compatible plants failed"
        })
    
    # Final Results Summary
    print(f"\n{'='*60}")
    print("FINAL TEST RESULTS")
    print(f"{'='*60}")
    print(f"Total Tests: {results['total_tests']}")
    print(f"✅ Passed: {results['passed']}")
    print(f"❌ Failed: {results['failed']}")
    print(f"Success Rate: {(results['passed']/results['total_tests']*100):.1f}%")
    
    # Detailed Results
    print(f"\n📊 DETAILED RESULTS:")
    for detail in results['details']:
        status_icon = "✅" if detail['status'] == "PASS" else "❌"
        print(f"{status_icon} {detail['test']}: {detail['status']}")
        if detail['status'] == "FAIL":
            print(f"   Error: {detail.get('error', 'Unknown error')}")
    
    if results['failed'] > 0:
        print(f"\n❌ Some tests failed. Check backend logs for more details:")
        print(f"   sudo supervisorctl status backend")
        print(f"   tail -n 50 /var/log/supervisor/backend.*.log")
        sys.exit(1)
    else:
        print(f"\n✅ All tests passed successfully!")
        sys.exit(0)

if __name__ == "__main__":
    main()