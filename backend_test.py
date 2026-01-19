#!/usr/bin/env python3
"""
Comprehensive Backend API Testing for Blossom App
Tests all backend endpoints with proper authentication and data validation
"""

import requests
import json
import sys
from datetime import datetime
import base64

# Configuration
BASE_URL = "https://moms-journey.preview.emergentagent.com/api"
TEST_USER_EMAIL = "sarah@example.com"
TEST_USER_PASSWORD = "test1234"

# Test data
TEST_POST_DATA = {
    "title": "My Pregnancy Journey - Week 20",
    "content": "Feeling the baby move for the first time! Such an amazing experience. Any other moms have similar experiences?",
    "category": "pregnancy",
    "tags": ["pregnancy", "baby_movement", "week20"],
    "images": []
}

TEST_COMMENT_DATA = {
    "content": "Congratulations! I remember that feeling too. It's so magical when you first feel those little kicks!"
}

TEST_MILESTONE_DATA = {
    "child_name": "Emma",
    "milestone_type": "physical",
    "title": "First Steps",
    "description": "Baby took her first independent steps",
    "age_months": 12
}

TEST_PUSH_TOKEN_DATA = {
    "token": "ExponentPushToken[test_token_12345]",
    "platform": "ios"
}

class BlossomAPITester:
    def __init__(self):
        self.session = requests.Session()
        self.auth_token = None
        self.session_token = None
        self.test_user_id = None
        self.test_post_id = None
        self.test_milestone_id = None
        self.results = {
            "passed": [],
            "failed": [],
            "critical_failures": []
        }

    def log_result(self, test_name, success, details="", is_critical=False):
        """Log test results"""
        result = {
            "test": test_name,
            "success": success,
            "details": details,
            "timestamp": datetime.now().isoformat()
        }
        
        if success:
            self.results["passed"].append(result)
            print(f"✅ {test_name}")
        else:
            self.results["failed"].append(result)
            if is_critical:
                self.results["critical_failures"].append(result)
            print(f"❌ {test_name}: {details}")

    def test_user_registration(self):
        """Test JWT user registration"""
        print("\n=== Testing User Registration (JWT) ===")
        
        # Use a unique email for registration test
        test_email = f"test_user_{datetime.now().strftime('%Y%m%d_%H%M%S')}@example.com"
        
        data = {
            "email": test_email,
            "password": "testpass123",
            "name": "Test User Registration"
        }
        
        try:
            response = self.session.post(f"{BASE_URL}/auth/register", json=data)
            
            if response.status_code == 200:
                result = response.json()
                if "access_token" in result and "user" in result:
                    self.log_result("User Registration (JWT)", True, "Registration successful with token")
                else:
                    self.log_result("User Registration (JWT)", False, "Missing token or user in response", True)
            else:
                self.log_result("User Registration (JWT)", False, f"Status: {response.status_code}, Response: {response.text}", True)
                
        except Exception as e:
            self.log_result("User Registration (JWT)", False, f"Exception: {str(e)}", True)

    def test_user_login(self):
        """Test JWT user login"""
        print("\n=== Testing User Login (JWT) ===")
        
        data = {
            "email": TEST_USER_EMAIL,
            "password": TEST_USER_PASSWORD
        }
        
        try:
            response = self.session.post(f"{BASE_URL}/auth/login", json=data)
            
            if response.status_code == 200:
                result = response.json()
                if "access_token" in result and "user" in result:
                    self.auth_token = result["access_token"]
                    self.test_user_id = result["user"]["user_id"]
                    self.session.headers.update({"Authorization": f"Bearer {self.auth_token}"})
                    self.log_result("User Login (JWT)", True, "Login successful with token")
                else:
                    self.log_result("User Login (JWT)", False, "Missing token or user in response", True)
            else:
                self.log_result("User Login (JWT)", False, f"Status: {response.status_code}, Response: {response.text}", True)
                
        except Exception as e:
            self.log_result("User Login (JWT)", False, f"Exception: {str(e)}", True)

    def test_google_oauth_session(self):
        """Test Google OAuth session exchange"""
        print("\n=== Testing Google OAuth Integration ===")
        
        # This test simulates the session exchange process
        # In real scenario, we'd need a valid session ID from Emergent Auth
        test_session_id = "test_session_12345"
        
        try:
            headers = {"X-Session-ID": test_session_id}
            response = self.session.get(f"{BASE_URL}/auth/session-data", headers=headers)
            
            # We expect this to fail with 401 since we don't have a real session ID
            # But we're testing that the endpoint exists and handles the request properly
            if response.status_code == 401:
                self.log_result("Google OAuth Integration", True, "Endpoint exists and properly validates session ID")
            elif response.status_code == 400:
                # Test without header
                response2 = self.session.get(f"{BASE_URL}/auth/session-data")
                if response2.status_code == 400:
                    self.log_result("Google OAuth Integration", True, "Endpoint properly requires X-Session-ID header")
                else:
                    self.log_result("Google OAuth Integration", False, "Endpoint doesn't properly validate missing header")
            else:
                self.log_result("Google OAuth Integration", False, f"Unexpected status: {response.status_code}")
                
        except Exception as e:
            self.log_result("Google OAuth Integration", False, f"Exception: {str(e)}", True)

    def test_get_current_user(self):
        """Test get current user endpoint"""
        print("\n=== Testing Get Current User ===")
        
        if not self.auth_token:
            self.log_result("Get Current User", False, "No auth token available", True)
            return
            
        try:
            response = self.session.get(f"{BASE_URL}/auth/me")
            
            if response.status_code == 200:
                user = response.json()
                if "user_id" in user and "email" in user:
                    self.log_result("Get Current User", True, "User data retrieved successfully")
                else:
                    self.log_result("Get Current User", False, "Missing required user fields")
            else:
                self.log_result("Get Current User", False, f"Status: {response.status_code}, Response: {response.text}")
                
        except Exception as e:
            self.log_result("Get Current User", False, f"Exception: {str(e)}")

    def test_logout(self):
        """Test user logout"""
        print("\n=== Testing User Logout ===")
        
        try:
            response = self.session.post(f"{BASE_URL}/auth/logout")
            
            if response.status_code == 200:
                result = response.json()
                if "message" in result:
                    self.log_result("User Logout", True, "Logout successful")
                else:
                    self.log_result("User Logout", False, "Missing message in response")
            else:
                self.log_result("User Logout", False, f"Status: {response.status_code}, Response: {response.text}")
                
        except Exception as e:
            self.log_result("User Logout", False, f"Exception: {str(e)}")

    def test_create_post(self):
        """Test post creation with AI moderation"""
        print("\n=== Testing Post Creation with AI Moderation ===")
        
        if not self.auth_token:
            self.log_result("Post Creation", False, "No auth token available", True)
            return
            
        try:
            response = self.session.post(f"{BASE_URL}/posts", json=TEST_POST_DATA)
            
            if response.status_code == 200:
                post = response.json()
                if "post_id" in post and "moderation_status" in post:
                    self.test_post_id = post["post_id"]
                    self.log_result("Post Creation with AI Moderation", True, f"Post created with moderation status: {post['moderation_status']}")
                else:
                    self.log_result("Post Creation with AI Moderation", False, "Missing required post fields")
            else:
                self.log_result("Post Creation with AI Moderation", False, f"Status: {response.status_code}, Response: {response.text}", True)
                
        except Exception as e:
            self.log_result("Post Creation with AI Moderation", False, f"Exception: {str(e)}", True)

    def test_get_posts_feed(self):
        """Test posts feed API"""
        print("\n=== Testing Posts Feed API ===")
        
        if not self.auth_token:
            self.log_result("Posts Feed API", False, "No auth token available", True)
            return
            
        try:
            # Test without category filter
            response = self.session.get(f"{BASE_URL}/posts")
            
            if response.status_code == 200:
                posts = response.json()
                if isinstance(posts, list):
                    self.log_result("Posts Feed API (All)", True, f"Retrieved {len(posts)} posts")
                    
                    # Test with category filter
                    response2 = self.session.get(f"{BASE_URL}/posts?category=pregnancy")
                    if response2.status_code == 200:
                        pregnancy_posts = response2.json()
                        self.log_result("Posts Feed API (Category Filter)", True, f"Retrieved {len(pregnancy_posts)} pregnancy posts")
                    else:
                        self.log_result("Posts Feed API (Category Filter)", False, f"Category filter failed: {response2.status_code}")
                else:
                    self.log_result("Posts Feed API", False, "Response is not a list")
            else:
                self.log_result("Posts Feed API", False, f"Status: {response.status_code}, Response: {response.text}", True)
                
        except Exception as e:
            self.log_result("Posts Feed API", False, f"Exception: {str(e)}", True)

    def test_get_single_post(self):
        """Test get single post"""
        print("\n=== Testing Get Single Post ===")
        
        if not self.auth_token:
            self.log_result("Get Single Post", False, "No auth token available")
            return
            
        if not self.test_post_id:
            self.log_result("Get Single Post", False, "No test post ID available")
            return
            
        try:
            response = self.session.get(f"{BASE_URL}/posts/{self.test_post_id}")
            
            if response.status_code == 200:
                post = response.json()
                if "post_id" in post and post["post_id"] == self.test_post_id:
                    self.log_result("Get Single Post", True, "Post retrieved successfully")
                else:
                    self.log_result("Get Single Post", False, "Post ID mismatch")
            else:
                self.log_result("Get Single Post", False, f"Status: {response.status_code}, Response: {response.text}")
                
        except Exception as e:
            self.log_result("Get Single Post", False, f"Exception: {str(e)}")

    def test_like_post(self):
        """Test post like/unlike functionality"""
        print("\n=== Testing Likes System ===")
        
        if not self.auth_token:
            self.log_result("Likes System", False, "No auth token available")
            return
            
        if not self.test_post_id:
            self.log_result("Likes System", False, "No test post ID available")
            return
            
        try:
            # Like the post
            response = self.session.post(f"{BASE_URL}/posts/{self.test_post_id}/like")
            
            if response.status_code == 200:
                result = response.json()
                if "liked" in result:
                    liked_status = result["liked"]
                    self.log_result("Likes System (Like)", True, f"Post liked: {liked_status}")
                    
                    # Unlike the post
                    response2 = self.session.post(f"{BASE_URL}/posts/{self.test_post_id}/like")
                    if response2.status_code == 200:
                        result2 = response2.json()
                        if "liked" in result2 and result2["liked"] != liked_status:
                            self.log_result("Likes System (Unlike)", True, f"Post unliked: {result2['liked']}")
                        else:
                            self.log_result("Likes System (Unlike)", False, "Like toggle not working properly")
                    else:
                        self.log_result("Likes System (Unlike)", False, f"Unlike failed: {response2.status_code}")
                else:
                    self.log_result("Likes System", False, "Missing 'liked' field in response")
            else:
                self.log_result("Likes System", False, f"Status: {response.status_code}, Response: {response.text}")
                
        except Exception as e:
            self.log_result("Likes System", False, f"Exception: {str(e)}")

    def test_comments_system(self):
        """Test comments creation and retrieval"""
        print("\n=== Testing Comments System ===")
        
        if not self.auth_token:
            self.log_result("Comments System", False, "No auth token available")
            return
            
        if not self.test_post_id:
            self.log_result("Comments System", False, "No test post ID available")
            return
            
        try:
            # Create comment
            comment_data = {**TEST_COMMENT_DATA, "post_id": self.test_post_id}
            response = self.session.post(f"{BASE_URL}/comments", json=comment_data)
            
            if response.status_code == 200:
                comment = response.json()
                if "comment_id" in comment and "post_id" in comment:
                    self.log_result("Comments System (Create)", True, "Comment created successfully")
                    
                    # Get comments for post
                    response2 = self.session.get(f"{BASE_URL}/posts/{self.test_post_id}/comments")
                    if response2.status_code == 200:
                        comments = response2.json()
                        if isinstance(comments, list) and len(comments) > 0:
                            self.log_result("Comments System (Retrieve)", True, f"Retrieved {len(comments)} comments")
                        else:
                            self.log_result("Comments System (Retrieve)", False, "No comments retrieved")
                    else:
                        self.log_result("Comments System (Retrieve)", False, f"Get comments failed: {response2.status_code}")
                else:
                    self.log_result("Comments System (Create)", False, "Missing required comment fields")
            else:
                self.log_result("Comments System", False, f"Status: {response.status_code}, Response: {response.text}")
                
        except Exception as e:
            self.log_result("Comments System", False, f"Exception: {str(e)}")

    def test_forums_api(self):
        """Test forums API"""
        print("\n=== Testing Forums API ===")
        
        if not self.auth_token:
            self.log_result("Forums API", False, "No auth token available")
            return
            
        try:
            # Get all forums
            response = self.session.get(f"{BASE_URL}/forums")
            
            if response.status_code == 200:
                forums = response.json()
                if isinstance(forums, list):
                    self.log_result("Forums API (List)", True, f"Retrieved {len(forums)} forums")
                    
                    # Test get single forum if forums exist
                    if len(forums) > 0:
                        forum_id = forums[0]["forum_id"]
                        response2 = self.session.get(f"{BASE_URL}/forums/{forum_id}")
                        if response2.status_code == 200:
                            forum = response2.json()
                            if "forum_id" in forum:
                                self.log_result("Forums API (Single)", True, "Forum details retrieved successfully")
                            else:
                                self.log_result("Forums API (Single)", False, "Missing forum_id in response")
                        else:
                            self.log_result("Forums API (Single)", False, f"Get single forum failed: {response2.status_code}")
                    else:
                        self.log_result("Forums API (Single)", False, "No forums available to test single forum endpoint")
                else:
                    self.log_result("Forums API", False, "Response is not a list")
            else:
                self.log_result("Forums API", False, f"Status: {response.status_code}, Response: {response.text}")
                
        except Exception as e:
            self.log_result("Forums API", False, f"Exception: {str(e)}")

    def test_support_groups_api(self):
        """Test support groups API"""
        print("\n=== Testing Support Groups API ===")
        
        if not self.auth_token:
            self.log_result("Support Groups API", False, "No auth token available")
            return
            
        try:
            # Get all support groups
            response = self.session.get(f"{BASE_URL}/support-groups")
            
            if response.status_code == 200:
                groups = response.json()
                if isinstance(groups, list):
                    self.log_result("Support Groups API (List)", True, f"Retrieved {len(groups)} support groups")
                    
                    # Test join support group if groups exist
                    if len(groups) > 0:
                        group_id = groups[0]["group_id"]
                        response2 = self.session.post(f"{BASE_URL}/support-groups/{group_id}/join")
                        if response2.status_code == 200:
                            result = response2.json()
                            if "message" in result:
                                self.log_result("Support Groups API (Join)", True, "Successfully joined support group")
                            else:
                                self.log_result("Support Groups API (Join)", False, "Missing message in join response")
                        else:
                            self.log_result("Support Groups API (Join)", False, f"Join group failed: {response2.status_code}")
                    else:
                        self.log_result("Support Groups API (Join)", False, "No groups available to test join endpoint")
                else:
                    self.log_result("Support Groups API", False, "Response is not a list")
            else:
                self.log_result("Support Groups API", False, f"Status: {response.status_code}, Response: {response.text}")
                
        except Exception as e:
            self.log_result("Support Groups API", False, f"Exception: {str(e)}")

    def test_milestones_tracking(self):
        """Test milestones tracking"""
        print("\n=== Testing Milestones Tracking ===")
        
        if not self.auth_token:
            self.log_result("Milestones Tracking", False, "No auth token available")
            return
            
        try:
            # Create milestone
            response = self.session.post(f"{BASE_URL}/milestones", json=TEST_MILESTONE_DATA)
            
            if response.status_code == 200:
                milestone = response.json()
                if "milestone_id" in milestone:
                    self.test_milestone_id = milestone["milestone_id"]
                    self.log_result("Milestones Tracking (Create)", True, "Milestone created successfully")
                    
                    # Get user milestones
                    response2 = self.session.get(f"{BASE_URL}/milestones")
                    if response2.status_code == 200:
                        milestones = response2.json()
                        if isinstance(milestones, list):
                            self.log_result("Milestones Tracking (List)", True, f"Retrieved {len(milestones)} milestones")
                            
                            # Complete milestone
                            if self.test_milestone_id:
                                response3 = self.session.put(f"{BASE_URL}/milestones/{self.test_milestone_id}/complete")
                                if response3.status_code == 200:
                                    completed_milestone = response3.json()
                                    if completed_milestone.get("completed"):
                                        self.log_result("Milestones Tracking (Complete)", True, "Milestone completed successfully")
                                    else:
                                        self.log_result("Milestones Tracking (Complete)", False, "Milestone not marked as completed")
                                else:
                                    self.log_result("Milestones Tracking (Complete)", False, f"Complete milestone failed: {response3.status_code}")
                        else:
                            self.log_result("Milestones Tracking (List)", False, "Response is not a list")
                    else:
                        self.log_result("Milestones Tracking (List)", False, f"Get milestones failed: {response2.status_code}")
                else:
                    self.log_result("Milestones Tracking (Create)", False, "Missing milestone_id in response")
            else:
                self.log_result("Milestones Tracking", False, f"Status: {response.status_code}, Response: {response.text}")
                
        except Exception as e:
            self.log_result("Milestones Tracking", False, f"Exception: {str(e)}")

    def test_resources_library(self):
        """Test resources library"""
        print("\n=== Testing Resources Library ===")
        
        if not self.auth_token:
            self.log_result("Resources Library", False, "No auth token available")
            return
            
        try:
            # Get all resources
            response = self.session.get(f"{BASE_URL}/resources")
            
            if response.status_code == 200:
                resources = response.json()
                if isinstance(resources, list):
                    self.log_result("Resources Library (All)", True, f"Retrieved {len(resources)} resources")
                    
                    # Test with category filter
                    response2 = self.session.get(f"{BASE_URL}/resources?category=pregnancy")
                    if response2.status_code == 200:
                        pregnancy_resources = response2.json()
                        if isinstance(pregnancy_resources, list):
                            self.log_result("Resources Library (Category Filter)", True, f"Retrieved {len(pregnancy_resources)} pregnancy resources")
                            
                            # Check premium filtering (non-premium user should only see non-premium resources)
                            premium_resources = [r for r in pregnancy_resources if r.get("is_premium", False)]
                            if len(premium_resources) == 0:
                                self.log_result("Resources Library (Premium Filter)", True, "Premium filtering working correctly")
                            else:
                                self.log_result("Resources Library (Premium Filter)", False, f"Found {len(premium_resources)} premium resources for non-premium user")
                        else:
                            self.log_result("Resources Library (Category Filter)", False, "Category filter response is not a list")
                    else:
                        self.log_result("Resources Library (Category Filter)", False, f"Category filter failed: {response2.status_code}")
                else:
                    self.log_result("Resources Library", False, "Response is not a list")
            else:
                self.log_result("Resources Library", False, f"Status: {response.status_code}, Response: {response.text}")
                
        except Exception as e:
            self.log_result("Resources Library", False, f"Exception: {str(e)}")

    def test_premium_membership(self):
        """Test premium membership"""
        print("\n=== Testing Premium Membership ===")
        
        if not self.auth_token:
            self.log_result("Premium Membership", False, "No auth token available")
            return
            
        try:
            # Get premium status (should be false initially)
            response = self.session.get(f"{BASE_URL}/premium/status")
            
            if response.status_code == 200:
                status = response.json()
                if "is_premium" in status:
                    initial_premium = status["is_premium"]
                    self.log_result("Premium Membership (Status)", True, f"Premium status retrieved: {initial_premium}")
                    
                    # Subscribe to premium
                    response2 = self.session.post(f"{BASE_URL}/premium/subscribe")
                    if response2.status_code == 200:
                        result = response2.json()
                        if "is_premium" in result and result["is_premium"]:
                            self.log_result("Premium Membership (Subscribe)", True, "Premium subscription successful")
                            
                            # Verify status changed
                            response3 = self.session.get(f"{BASE_URL}/premium/status")
                            if response3.status_code == 200:
                                new_status = response3.json()
                                if new_status.get("is_premium"):
                                    self.log_result("Premium Membership (Status Update)", True, "Premium status updated correctly")
                                else:
                                    self.log_result("Premium Membership (Status Update)", False, "Premium status not updated")
                            else:
                                self.log_result("Premium Membership (Status Update)", False, f"Status check failed: {response3.status_code}")
                        else:
                            self.log_result("Premium Membership (Subscribe)", False, "Premium subscription response invalid")
                    else:
                        self.log_result("Premium Membership (Subscribe)", False, f"Subscribe failed: {response2.status_code}")
                else:
                    self.log_result("Premium Membership (Status)", False, "Missing is_premium in response")
            else:
                self.log_result("Premium Membership", False, f"Status: {response.status_code}, Response: {response.text}")
                
        except Exception as e:
            self.log_result("Premium Membership", False, f"Exception: {str(e)}")

    def test_push_notifications(self):
        """Test push notification token registration"""
        print("\n=== Testing Push Notification Token Registration ===")
        
        if not self.auth_token:
            self.log_result("Push Notification Token Registration", False, "No auth token available")
            return
            
        try:
            # Register push token
            response = self.session.post(f"{BASE_URL}/notifications/register-token", json=TEST_PUSH_TOKEN_DATA)
            
            if response.status_code == 200:
                result = response.json()
                if "message" in result:
                    self.log_result("Push Notification Token Registration", True, "Push token registered successfully")
                    
                    # Test notification preferences
                    response2 = self.session.get(f"{BASE_URL}/notifications/preferences")
                    if response2.status_code == 200:
                        prefs = response2.json()
                        if "user_id" in prefs:
                            self.log_result("Notification Preferences (Get)", True, "Preferences retrieved successfully")
                            
                            # Update preferences
                            update_data = {"new_posts": False, "milestone_reminders": True}
                            response3 = self.session.put(f"{BASE_URL}/notifications/preferences", json=update_data)
                            if response3.status_code == 200:
                                self.log_result("Notification Preferences (Update)", True, "Preferences updated successfully")
                            else:
                                self.log_result("Notification Preferences (Update)", False, f"Update failed: {response3.status_code}")
                        else:
                            self.log_result("Notification Preferences (Get)", False, "Missing user_id in preferences")
                    else:
                        self.log_result("Notification Preferences (Get)", False, f"Get preferences failed: {response2.status_code}")
                else:
                    self.log_result("Push Notification Token Registration", False, "Missing message in response")
            else:
                self.log_result("Push Notification Token Registration", False, f"Status: {response.status_code}, Response: {response.text}")
                
        except Exception as e:
            self.log_result("Push Notification Token Registration", False, f"Exception: {str(e)}")

    def run_all_tests(self):
        """Run all backend tests in priority order"""
        print("🚀 Starting Blossom Backend API Testing")
        print(f"Base URL: {BASE_URL}")
        print(f"Test User: {TEST_USER_EMAIL}")
        
        # Seed data first
        try:
            seed_response = self.session.post(f"{BASE_URL}/seed-data")
            if seed_response.status_code == 200:
                print("✅ Data seeded successfully")
            else:
                print(f"⚠️ Seed data warning: {seed_response.status_code}")
        except Exception as e:
            print(f"⚠️ Seed data error: {e}")
        
        # HIGH PRIORITY TESTS
        print("\n" + "="*50)
        print("HIGH PRIORITY TESTS")
        print("="*50)
        
        self.test_user_registration()
        self.test_user_login()
        self.test_google_oauth_session()
        self.test_get_current_user()
        self.test_create_post()
        self.test_get_posts_feed()
        self.test_get_single_post()
        
        # MEDIUM PRIORITY TESTS
        print("\n" + "="*50)
        print("MEDIUM PRIORITY TESTS")
        print("="*50)
        
        self.test_like_post()
        self.test_comments_system()
        self.test_forums_api()
        self.test_support_groups_api()
        self.test_milestones_tracking()
        self.test_resources_library()
        self.test_push_notifications()
        
        # LOW PRIORITY TESTS
        print("\n" + "="*50)
        print("LOW PRIORITY TESTS")
        print("="*50)
        
        self.test_premium_membership()
        self.test_logout()
        
        # Print summary
        self.print_summary()

    def print_summary(self):
        """Print test results summary"""
        print("\n" + "="*60)
        print("TEST RESULTS SUMMARY")
        print("="*60)
        
        total_tests = len(self.results["passed"]) + len(self.results["failed"])
        passed_count = len(self.results["passed"])
        failed_count = len(self.results["failed"])
        critical_count = len(self.results["critical_failures"])
        
        print(f"Total Tests: {total_tests}")
        print(f"✅ Passed: {passed_count}")
        print(f"❌ Failed: {failed_count}")
        print(f"🚨 Critical Failures: {critical_count}")
        
        if failed_count > 0:
            print("\n--- FAILED TESTS ---")
            for failure in self.results["failed"]:
                print(f"❌ {failure['test']}: {failure['details']}")
        
        if critical_count > 0:
            print("\n--- CRITICAL FAILURES ---")
            for critical in self.results["critical_failures"]:
                print(f"🚨 {critical['test']}: {critical['details']}")
        
        print(f"\nSuccess Rate: {(passed_count/total_tests)*100:.1f}%")

if __name__ == "__main__":
    tester = BlossomAPITester()
    tester.run_all_tests()