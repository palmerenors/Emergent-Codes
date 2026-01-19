from fastapi import FastAPI, APIRouter, HTTPException, Depends, Header, Response, Request
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timedelta, timezone
from jose import JWTError, jwt
from passlib.context import CryptContext
import httpx
from emergentintegrations.llm.chat import LlmChat, UserMessage
from exponent_server_sdk import PushClient, PushMessage

# Load environment variables
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Configuration
JWT_SECRET = os.environ.get('JWT_SECRET', 'your-secret-key-change-in-production')
JWT_ALGORITHM = os.environ.get('JWT_ALGORITHM', 'HS256')
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.environ.get('ACCESS_TOKEN_EXPIRE_MINUTES', 10080))

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Emergent LLM for content moderation
EMERGENT_LLM_KEY = os.environ.get('EMERGENT_LLM_KEY')

# Push notification client
push_client = PushClient()

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


# ============= MODELS =============

class User(BaseModel):
    user_id: str
    email: str
    name: str
    picture: Optional[str] = None
    bio: Optional[str] = None
    pregnancy_stage: Optional[str] = None  # "expecting", "postpartum_0_1y", "postpartum_1_3y"
    due_date: Optional[str] = None
    children_count: Optional[int] = 0
    interests: List[str] = []
    is_premium: bool = False
    created_at: datetime


class UserCreate(BaseModel):
    email: EmailStr
    password: str
    name: str


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class SessionDataResponse(BaseModel):
    id: str
    email: str
    name: str
    picture: Optional[str] = None
    session_token: str


class Post(BaseModel):
    post_id: str
    author_id: str
    author_name: str
    author_picture: Optional[str] = None
    title: str
    content: str
    images: List[str] = []  # base64 images
    category: str  # "pregnancy", "childbirth", "postpartum", "baby_milestones", "general"
    tags: List[str] = []
    likes_count: int = 0
    comments_count: int = 0
    is_moderated: bool = False
    moderation_status: str = "pending"  # "pending", "approved", "rejected"
    created_at: datetime


class PostCreate(BaseModel):
    title: str
    content: str
    images: List[str] = []
    category: str
    tags: List[str] = []


class Comment(BaseModel):
    comment_id: str
    post_id: str
    author_id: str
    author_name: str
    author_picture: Optional[str] = None
    content: str
    created_at: datetime


class CommentCreate(BaseModel):
    post_id: str
    content: str


class Forum(BaseModel):
    forum_id: str
    name: str
    description: str
    category: str
    members_count: int = 0
    posts_count: int = 0
    created_at: datetime


class SupportGroup(BaseModel):
    group_id: str
    name: str
    description: str
    theme: str  # "postpartum_depression", "breastfeeding", "sleep_training", etc.
    members: List[str] = []
    is_private: bool = False
    created_at: datetime


class Milestone(BaseModel):
    milestone_id: str
    user_id: str
    child_name: str
    milestone_type: str  # "physical", "cognitive", "social", "language"
    title: str
    description: str
    age_months: int
    completed: bool = False
    completed_at: Optional[datetime] = None
    notes: Optional[str] = None
    created_at: datetime


class MilestoneCreate(BaseModel):
    child_name: str
    milestone_type: str
    title: str
    description: str
    age_months: int


class Resource(BaseModel):
    resource_id: str
    title: str
    content: str
    resource_type: str  # "article", "video", "guide"
    category: str
    author: str
    tags: List[str] = []
    is_premium: bool = False
    created_at: datetime


class PushToken(BaseModel):
    token_id: str
    user_id: str
    token: str
    platform: str  # "ios", "android", "web"
    is_active: bool = True
    created_at: datetime


class PushTokenCreate(BaseModel):
    token: str
    platform: str


class NotificationPreferences(BaseModel):
    user_id: str
    new_posts: bool = True
    milestone_reminders: bool = True
    group_updates: bool = True
    premium_notifications: bool = True


# ============= HELPER FUNCTIONS =============

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, JWT_SECRET, algorithm=JWT_ALGORITHM)
    return encoded_jwt


def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password):
    return pwd_context.hash(password)


async def get_current_user_from_token(authorization: Optional[str] = Header(None)) -> Optional[Dict]:
    """Get user from JWT token or session token"""
    if not authorization:
        return None
    
    try:
        # Try JWT token first
        if authorization.startswith("Bearer "):
            token = authorization.replace("Bearer ", "")
            payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
            user_id: str = payload.get("sub")
            if user_id is None:
                return None
            
            user = await db.users.find_one({"user_id": user_id}, {"_id": 0})
            return user
        
        # Try session token (for Emergent Auth)
        session = await db.user_sessions.find_one({"session_token": authorization}, {"_id": 0})
        if not session:
            return None
        
        # Check if session is expired
        expires_at = session.get("expires_at")
        if expires_at:
            if expires_at.tzinfo is None:
                expires_at = expires_at.replace(tzinfo=timezone.utc)
            if expires_at < datetime.now(timezone.utc):
                return None
        
        user = await db.users.find_one({"user_id": session["user_id"]}, {"_id": 0})
        return user
        
    except JWTError:
        return None


async def require_auth(authorization: Optional[str] = Header(None)) -> Dict:
    """Require authentication"""
    user = await get_current_user_from_token(authorization)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return user


async def moderate_content(content: str) -> Dict[str, Any]:
    """Use AI to moderate user-generated content"""
    try:
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"moderation_{uuid.uuid4().hex[:8]}",
            system_message="You are a content moderator for a pregnancy and motherhood community app. Your job is to identify inappropriate content, spam, harmful medical advice, or offensive language. Respond with a JSON object containing 'approved' (boolean), 'reason' (string if not approved), and 'confidence' (0-1)."
        ).with_model("openai", "gpt-5.2")
        
        message = UserMessage(text=f"Moderate this content:\n\n{content}")
        response = await chat.send_message(message)
        
        # Parse response (simplified - in production, use proper JSON parsing)
        if "approved" in response.lower() and "true" in response.lower():
            return {"approved": True, "reason": None}
        else:
            return {"approved": False, "reason": "Content flagged by AI moderation"}
    except Exception as e:
        logger.error(f"Moderation error: {e}")
        # Default to approved if moderation fails
        return {"approved": True, "reason": None}


# ============= AUTH ENDPOINTS =============

@api_router.post("/auth/register")
async def register(user_data: UserCreate):
    """Register new user with email/password"""
    # Check if user exists
    existing = await db.users.find_one({"email": user_data.email}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Create user
    user_id = f"user_{uuid.uuid4().hex[:12]}"
    hashed_password = get_password_hash(user_data.password)
    
    user_doc = {
        "user_id": user_id,
        "email": user_data.email,
        "name": user_data.name,
        "password_hash": hashed_password,
        "picture": None,
        "bio": None,
        "pregnancy_stage": None,
        "due_date": None,
        "children_count": 0,
        "interests": [],
        "is_premium": False,
        "created_at": datetime.now(timezone.utc)
    }
    
    await db.users.insert_one(user_doc)
    
    # Create access token
    access_token = create_access_token({"sub": user_id})
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": User(**{k: v for k, v in user_doc.items() if k != "password_hash"})
    }


@api_router.post("/auth/login")
async def login(credentials: UserLogin):
    """Login with email/password"""
    user = await db.users.find_one({"email": credentials.email}, {"_id": 0})
    if not user or not verify_password(credentials.password, user.get("password_hash", "")):
        raise HTTPException(status_code=401, detail="Incorrect email or password")
    
    # Create access token
    access_token = create_access_token({"sub": user["user_id"]})
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": User(**{k: v for k, v in user.items() if k != "password_hash"})
    }


@api_router.get("/auth/session-data")
async def get_session_data(x_session_id: str = Header(None)):
    """Exchange session_id for user data (Emergent Auth)"""
    if not x_session_id:
        raise HTTPException(status_code=400, detail="X-Session-ID header required")
    
    # Get user data from Emergent Auth
    async with httpx.AsyncClient() as client:
        response = await client.get(
            "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
            headers={"X-Session-ID": x_session_id}
        )
        
        if response.status_code != 200:
            raise HTTPException(status_code=401, detail="Invalid session ID")
        
        user_data = response.json()
    
    # Check if user exists
    user = await db.users.find_one({"email": user_data["email"]}, {"_id": 0})
    
    if not user:
        # Create new user
        user_id = f"user_{uuid.uuid4().hex[:12]}"
        user_doc = {
            "user_id": user_id,
            "email": user_data["email"],
            "name": user_data["name"],
            "picture": user_data.get("picture"),
            "bio": None,
            "pregnancy_stage": None,
            "due_date": None,
            "children_count": 0,
            "interests": [],
            "is_premium": False,
            "created_at": datetime.now(timezone.utc)
        }
        await db.users.insert_one(user_doc)
        user = user_doc
    
    # Create session
    session_token = f"session_{uuid.uuid4().hex}"
    await db.user_sessions.insert_one({
        "user_id": user["user_id"],
        "session_token": session_token,
        "expires_at": datetime.now(timezone.utc) + timedelta(days=7),
        "created_at": datetime.now(timezone.utc)
    })
    
    return SessionDataResponse(
        id=user["user_id"],
        email=user["email"],
        name=user["name"],
        picture=user.get("picture"),
        session_token=session_token
    )


@api_router.get("/auth/me")
async def get_me(user: Dict = Depends(require_auth)):
    """Get current user"""
    return User(**{k: v for k, v in user.items() if k != "password_hash"})


@api_router.post("/auth/logout")
async def logout(authorization: Optional[str] = Header(None)):
    """Logout user"""
    if authorization and not authorization.startswith("Bearer "):
        # Session token logout
        await db.user_sessions.delete_one({"session_token": authorization})
    return {"message": "Logged out successfully"}


# ============= USER ENDPOINTS =============

@api_router.get("/users/me")
async def get_current_user(user: Dict = Depends(require_auth)):
    """Get current user profile"""
    return User(**{k: v for k, v in user.items() if k != "password_hash"})


@api_router.put("/users/me")
async def update_profile(
    updates: Dict[str, Any],
    user: Dict = Depends(require_auth)
):
    """Update user profile"""
    allowed_fields = ["name", "bio", "picture", "pregnancy_stage", "due_date", "children_count", "interests"]
    update_data = {k: v for k, v in updates.items() if k in allowed_fields}
    
    if update_data:
        await db.users.update_one(
            {"user_id": user["user_id"]},
            {"$set": update_data}
        )
    
    updated_user = await db.users.find_one({"user_id": user["user_id"]}, {"_id": 0})
    return User(**{k: v for k, v in updated_user.items() if k != "password_hash"})


# ============= POST ENDPOINTS =============

@api_router.post("/posts")
async def create_post(post_data: PostCreate, user: Dict = Depends(require_auth)):
    """Create new post with AI moderation"""
    # Moderate content
    moderation = await moderate_content(f"{post_data.title}\n{post_data.content}")
    
    post_id = f"post_{uuid.uuid4().hex[:12]}"
    post_doc = {
        "post_id": post_id,
        "author_id": user["user_id"],
        "author_name": user["name"],
        "author_picture": user.get("picture"),
        "title": post_data.title,
        "content": post_data.content,
        "images": post_data.images,
        "category": post_data.category,
        "tags": post_data.tags,
        "likes_count": 0,
        "comments_count": 0,
        "is_moderated": True,
        "moderation_status": "approved" if moderation["approved"] else "rejected",
        "created_at": datetime.now(timezone.utc)
    }
    
    if moderation["approved"]:
        await db.posts.insert_one(post_doc)
        
        # Send notifications to interested users (simplified)
        # In production, this would be a background task
        await send_new_post_notifications(post_doc)
        
        return Post(**post_doc)
    else:
        raise HTTPException(status_code=400, detail=f"Content not approved: {moderation['reason']}")


@api_router.get("/posts")
async def get_posts(
    category: Optional[str] = None,
    limit: int = 20,
    skip: int = 0,
    user: Dict = Depends(require_auth)
):
    """Get posts feed"""
    query = {"moderation_status": "approved"}
    if category:
        query["category"] = category
    
    posts = await db.posts.find(query, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    return [Post(**post) for post in posts]


@api_router.get("/posts/{post_id}")
async def get_post(post_id: str, user: Dict = Depends(require_auth)):
    """Get single post"""
    post = await db.posts.find_one({"post_id": post_id}, {"_id": 0})
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    return Post(**post)


@api_router.post("/posts/{post_id}/like")
async def like_post(post_id: str, user: Dict = Depends(require_auth)):
    """Like a post"""
    # Check if already liked
    existing_like = await db.likes.find_one({"post_id": post_id, "user_id": user["user_id"]})
    
    if existing_like:
        # Unlike
        await db.likes.delete_one({"post_id": post_id, "user_id": user["user_id"]})
        await db.posts.update_one({"post_id": post_id}, {"$inc": {"likes_count": -1}})
        return {"liked": False}
    else:
        # Like
        await db.likes.insert_one({
            "post_id": post_id,
            "user_id": user["user_id"],
            "created_at": datetime.now(timezone.utc)
        })
        await db.posts.update_one({"post_id": post_id}, {"$inc": {"likes_count": 1}})
        return {"liked": True}


# ============= COMMENT ENDPOINTS =============

@api_router.post("/comments")
async def create_comment(comment_data: CommentCreate, user: Dict = Depends(require_auth)):
    """Create comment on post"""
    # Moderate content
    moderation = await moderate_content(comment_data.content)
    
    if not moderation["approved"]:
        raise HTTPException(status_code=400, detail="Comment not approved by moderation")
    
    comment_id = f"comment_{uuid.uuid4().hex[:12]}"
    comment_doc = {
        "comment_id": comment_id,
        "post_id": comment_data.post_id,
        "author_id": user["user_id"],
        "author_name": user["name"],
        "author_picture": user.get("picture"),
        "content": comment_data.content,
        "created_at": datetime.now(timezone.utc)
    }
    
    await db.comments.insert_one(comment_doc)
    
    # Update post comment count
    await db.posts.update_one(
        {"post_id": comment_data.post_id},
        {"$inc": {"comments_count": 1}}
    )
    
    return Comment(**comment_doc)


@api_router.get("/posts/{post_id}/comments")
async def get_comments(post_id: str, user: Dict = Depends(require_auth)):
    """Get comments for post"""
    comments = await db.comments.find({"post_id": post_id}, {"_id": 0}).sort("created_at", 1).to_list(100)
    return [Comment(**comment) for comment in comments]


# ============= FORUM ENDPOINTS =============

@api_router.get("/forums")
async def get_forums(user: Dict = Depends(require_auth)):
    """Get all forums"""
    forums = await db.forums.find({}, {"_id": 0}).to_list(100)
    return [Forum(**forum) for forum in forums]


@api_router.get("/forums/{forum_id}")
async def get_forum(forum_id: str, user: Dict = Depends(require_auth)):
    """Get forum details"""
    forum = await db.forums.find_one({"forum_id": forum_id}, {"_id": 0})
    if not forum:
        raise HTTPException(status_code=404, detail="Forum not found")
    return Forum(**forum)


# ============= SUPPORT GROUP ENDPOINTS =============

@api_router.get("/support-groups")
async def get_support_groups(user: Dict = Depends(require_auth)):
    """Get support groups"""
    groups = await db.support_groups.find({}, {"_id": 0}).to_list(100)
    return [SupportGroup(**group) for group in groups]


@api_router.post("/support-groups/{group_id}/join")
async def join_support_group(group_id: str, user: Dict = Depends(require_auth)):
    """Join a support group"""
    result = await db.support_groups.update_one(
        {"group_id": group_id},
        {"$addToSet": {"members": user["user_id"]}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Group not found or already a member")
    
    return {"message": "Joined group successfully"}


# ============= MILESTONE ENDPOINTS =============

@api_router.post("/milestones")
async def create_milestone(milestone_data: MilestoneCreate, user: Dict = Depends(require_auth)):
    """Create milestone tracking"""
    milestone_id = f"milestone_{uuid.uuid4().hex[:12]}"
    milestone_doc = {
        "milestone_id": milestone_id,
        "user_id": user["user_id"],
        "child_name": milestone_data.child_name,
        "milestone_type": milestone_data.milestone_type,
        "title": milestone_data.title,
        "description": milestone_data.description,
        "age_months": milestone_data.age_months,
        "completed": False,
        "completed_at": None,
        "notes": None,
        "created_at": datetime.now(timezone.utc)
    }
    
    await db.milestones.insert_one(milestone_doc)
    return Milestone(**milestone_doc)


@api_router.get("/milestones")
async def get_milestones(user: Dict = Depends(require_auth)):
    """Get user's milestones"""
    milestones = await db.milestones.find({"user_id": user["user_id"]}, {"_id": 0}).sort("age_months", 1).to_list(100)
    return [Milestone(**milestone) for milestone in milestones]


@api_router.put("/milestones/{milestone_id}/complete")
async def complete_milestone(milestone_id: str, notes: Optional[str] = None, user: Dict = Depends(require_auth)):
    """Mark milestone as completed"""
    await db.milestones.update_one(
        {"milestone_id": milestone_id, "user_id": user["user_id"]},
        {
            "$set": {
                "completed": True,
                "completed_at": datetime.now(timezone.utc),
                "notes": notes
            }
        }
    )
    
    milestone = await db.milestones.find_one({"milestone_id": milestone_id}, {"_id": 0})
    if not milestone:
        raise HTTPException(status_code=404, detail="Milestone not found")
    
    return Milestone(**milestone)


# ============= RESOURCE ENDPOINTS =============

@api_router.get("/resources")
async def get_resources(
    category: Optional[str] = None,
    user: Dict = Depends(require_auth)
):
    """Get resources (articles, videos)"""
    query = {}
    if category:
        query["category"] = category
    
    # Non-premium users can only see non-premium resources
    if not user.get("is_premium"):
        query["is_premium"] = False
    
    resources = await db.resources.find(query, {"_id": 0}).sort("created_at", -1).to_list(50)
    return [Resource(**resource) for resource in resources]


# ============= PREMIUM ENDPOINTS =============

@api_router.post("/premium/subscribe")
async def subscribe_premium(user: Dict = Depends(require_auth)):
    """Subscribe to premium (simplified - no actual payment)"""
    await db.users.update_one(
        {"user_id": user["user_id"]},
        {"$set": {"is_premium": True}}
    )
    
    return {"message": "Premium subscription activated", "is_premium": True}


@api_router.get("/premium/status")
async def get_premium_status(user: Dict = Depends(require_auth)):
    """Get premium status"""
    return {"is_premium": user.get("is_premium", False)}


# ============= NOTIFICATION ENDPOINTS =============

@api_router.post("/notifications/register-token")
async def register_push_token(token_data: PushTokenCreate, user: Dict = Depends(require_auth)):
    """Register push notification token"""
    token_id = f"token_{uuid.uuid4().hex[:12]}"
    
    # Check if token already exists
    existing = await db.push_tokens.find_one({"token": token_data.token})
    
    if existing:
        # Update user_id and activation status
        await db.push_tokens.update_one(
            {"token": token_data.token},
            {
                "$set": {
                    "user_id": user["user_id"],
                    "is_active": True,
                    "platform": token_data.platform
                }
            }
        )
    else:
        # Create new token
        token_doc = {
            "token_id": token_id,
            "user_id": user["user_id"],
            "token": token_data.token,
            "platform": token_data.platform,
            "is_active": True,
            "created_at": datetime.now(timezone.utc)
        }
        await db.push_tokens.insert_one(token_doc)
    
    return {"message": "Push token registered successfully"}


@api_router.get("/notifications/preferences")
async def get_notification_preferences(user: Dict = Depends(require_auth)):
    """Get notification preferences"""
    prefs = await db.notification_preferences.find_one({"user_id": user["user_id"]}, {"_id": 0})
    
    if not prefs:
        # Create default preferences
        prefs = {
            "user_id": user["user_id"],
            "new_posts": True,
            "milestone_reminders": True,
            "group_updates": True,
            "premium_notifications": True
        }
        await db.notification_preferences.insert_one(prefs)
    
    return NotificationPreferences(**prefs)


@api_router.put("/notifications/preferences")
async def update_notification_preferences(
    preferences: Dict[str, bool],
    user: Dict = Depends(require_auth)
):
    """Update notification preferences"""
    await db.notification_preferences.update_one(
        {"user_id": user["user_id"]},
        {"$set": preferences},
        upsert=True
    )
    
    return {"message": "Preferences updated successfully"}



# ============= USER SEARCH ENDPOINTS =============

@api_router.get("/users/search")
async def search_users(
    q: str = "",
    interests: Optional[str] = None,
    pregnancy_stage: Optional[str] = None,
    limit: int = 20,
    user: Dict = Depends(require_auth)
):
    """Search for users by name, interests, or pregnancy stage"""
    query = {}
    
    if q:
        # Search by name (case-insensitive)
        query["name"] = {"$regex": q, "$options": "i"}
    
    if interests:
        query["interests"] = interests
    
    if pregnancy_stage:
        query["pregnancy_stage"] = pregnancy_stage
    
    # Exclude current user from results
    query["user_id"] = {"$ne": user["user_id"]}
    
    users = await db.users.find(query, {"_id": 0, "password_hash": 0}).limit(limit).to_list(limit)
    
    return users


# ============= DIRECT MESSAGING ENDPOINTS =============

class Message(BaseModel):
    message_id: str
    conversation_id: str
    sender_id: str
    sender_name: str
    sender_picture: Optional[str] = None
    content: str
    read: bool = False
    created_at: datetime


class MessageCreate(BaseModel):
    recipient_id: str
    content: str


class Conversation(BaseModel):
    conversation_id: str
    participants: List[str]
    participant_names: Dict[str, str]
    participant_pictures: Dict[str, Optional[str]]
    last_message: Optional[str] = None
    last_message_at: Optional[datetime] = None
    unread_count: int = 0
    created_at: datetime


@api_router.post("/messages")
async def send_message(message_data: MessageCreate, user: Dict = Depends(require_auth)):
    """Send a direct message"""
    # Check if recipient exists
    recipient = await db.users.find_one({"user_id": message_data.recipient_id}, {"_id": 0})
    if not recipient:
        raise HTTPException(status_code=404, detail="Recipient not found")
    
    # Find or create conversation
    participants = sorted([user["user_id"], message_data.recipient_id])
    conversation = await db.conversations.find_one(
        {"participants": participants},
        {"_id": 0}
    )
    
    if not conversation:
        # Create new conversation
        conversation_id = f"conv_{uuid.uuid4().hex[:12]}"
        conversation = {
            "conversation_id": conversation_id,
            "participants": participants,
            "participant_names": {
                user["user_id"]: user["name"],
                message_data.recipient_id: recipient["name"]
            },
            "participant_pictures": {
                user["user_id"]: user.get("picture"),
                message_data.recipient_id: recipient.get("picture")
            },
            "last_message": message_data.content,
            "last_message_at": datetime.now(timezone.utc),
            "created_at": datetime.now(timezone.utc)
        }
        await db.conversations.insert_one(conversation)
    else:
        # Update existing conversation
        conversation_id = conversation["conversation_id"]
        await db.conversations.update_one(
            {"conversation_id": conversation_id},
            {
                "$set": {
                    "last_message": message_data.content,
                    "last_message_at": datetime.now(timezone.utc)
                }
            }
        )
    
    # Create message
    message_id = f"msg_{uuid.uuid4().hex[:12]}"
    message_doc = {
        "message_id": message_id,
        "conversation_id": conversation_id,
        "sender_id": user["user_id"],
        "sender_name": user["name"],
        "sender_picture": user.get("picture"),
        "content": message_data.content,
        "read": False,
        "created_at": datetime.now(timezone.utc)
    }
    
    await db.messages.insert_one(message_doc)
    
    return Message(**message_doc)


@api_router.get("/conversations")
async def get_conversations(user: Dict = Depends(require_auth)):
    """Get user's conversations"""
    conversations = await db.conversations.find(
        {"participants": user["user_id"]},
        {"_id": 0}
    ).sort("last_message_at", -1).to_list(100)
    
    # Calculate unread counts
    for conv in conversations:
        unread = await db.messages.count_documents({
            "conversation_id": conv["conversation_id"],
            "sender_id": {"$ne": user["user_id"]},
            "read": False
        })
        conv["unread_count"] = unread
    
    return [Conversation(**conv) for conv in conversations]


@api_router.get("/conversations/{conversation_id}/messages")
async def get_messages(conversation_id: str, limit: int = 50, user: Dict = Depends(require_auth)):
    """Get messages in a conversation"""
    # Verify user is participant
    conversation = await db.conversations.find_one(
        {
            "conversation_id": conversation_id,
            "participants": user["user_id"]
        },
        {"_id": 0}
    )
    
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")
    
    # Get messages
    messages = await db.messages.find(
        {"conversation_id": conversation_id},
        {"_id": 0}
    ).sort("created_at", 1).limit(limit).to_list(limit)
    
    # Mark messages as read
    await db.messages.update_many(
        {
            "conversation_id": conversation_id,
            "sender_id": {"$ne": user["user_id"]},
            "read": False
        },
        {"$set": {"read": True}}
    )
    
    return [Message(**msg) for msg in messages]


# ============= PHOTO GALLERY ENDPOINTS =============

@api_router.get("/gallery/my-photos")
async def get_my_photos(user: Dict = Depends(require_auth)):
    """Get all photos from user's posts"""
    posts = await db.posts.find(
        {"author_id": user["user_id"], "images": {"$ne": []}},
        {"_id": 0, "post_id": 1, "title": 1, "images": 1, "created_at": 1}
    ).sort("created_at", -1).to_list(None)
    
    photos = []
    for post in posts:
        for idx, image in enumerate(post["images"]):
            photos.append({
                "photo_id": f"{post['post_id']}_{idx}",
                "post_id": post["post_id"],
                "post_title": post["title"],
                "image_url": image,
                "created_at": post["created_at"]
            })
    
    return photos


@api_router.get("/gallery/community")
async def get_community_photos(limit: int = 50, user: Dict = Depends(require_auth)):
    """Get recent photos from community posts"""
    posts = await db.posts.find(
        {"images": {"$ne": []}, "moderation_status": "approved"},
        {"_id": 0, "post_id": 1, "title": 1, "author_name": 1, "images": 1, "created_at": 1}
    ).sort("created_at", -1).limit(limit).to_list(limit)
    
    photos = []
    for post in posts:
        for idx, image in enumerate(post["images"]):
            photos.append({
                "photo_id": f"{post['post_id']}_{idx}",
                "post_id": post["post_id"],
                "post_title": post["title"],
                "author_name": post["author_name"],
                "image_url": image,
                "created_at": post["created_at"]
            })
    
    return photos



# ============= HELPER FUNCTIONS FOR NOTIFICATIONS =============

async def send_new_post_notifications(post: Dict):
    """Send notifications about new post"""
    try:
        # Get users interested in this category
        users = await db.users.find({
            "interests": post["category"]
        }, {"_id": 0, "user_id": 1}).to_list(None)
        
        if not users:
            return
        
        user_ids = [u["user_id"] for u in users]
        
        # Get their push tokens
        tokens = await db.push_tokens.find({
            "user_id": {"$in": user_ids},
            "is_active": True
        }, {"_id": 0}).to_list(None)
        
        if not tokens:
            return
        
        # Send notifications
        messages = []
        for token_doc in tokens:
            messages.append(PushMessage(
                to=token_doc["token"],
                title="New Post in Your Interest",
                body=f"{post['author_name']}: {post['title'][:50]}...",
                data={
                    "type": "new_post",
                    "post_id": post["post_id"],
                    "category": post["category"]
                }
            ))
        
        # Send in batches
        push_client.publish_multiple(messages)
        
    except Exception as e:
        logger.error(f"Error sending notifications: {e}")


# ============= SEED DATA ENDPOINT (FOR DEVELOPMENT) =============

@api_router.post("/seed-data")
async def seed_data():
    """Seed initial data for forums, support groups, and resources"""
    # Forums
    forums_data = [
        {"forum_id": "forum_pregnancy", "name": "Pregnancy Journey", "description": "Share your pregnancy experiences", "category": "pregnancy", "members_count": 0, "posts_count": 0},
        {"forum_id": "forum_childbirth", "name": "Childbirth Stories", "description": "Birth stories and experiences", "category": "childbirth", "members_count": 0, "posts_count": 0},
        {"forum_id": "forum_postpartum", "name": "Postpartum Recovery", "description": "Postpartum journey and recovery", "category": "postpartum", "members_count": 0, "posts_count": 0},
        {"forum_id": "forum_milestones", "name": "Baby Milestones", "description": "Track and celebrate baby milestones", "category": "baby_milestones", "members_count": 0, "posts_count": 0}
    ]
    
    for forum in forums_data:
        forum["created_at"] = datetime.now(timezone.utc)
        await db.forums.update_one(
            {"forum_id": forum["forum_id"]},
            {"$setOnInsert": forum},
            upsert=True
        )
    
    # Support Groups
    groups_data = [
        {"group_id": "group_ppd", "name": "Postpartum Depression Support", "description": "Support for mothers dealing with postpartum depression", "theme": "postpartum_depression", "members": [], "is_private": False},
        {"group_id": "group_breastfeeding", "name": "Breastfeeding Support", "description": "Tips and support for breastfeeding mothers", "theme": "breastfeeding", "members": [], "is_private": False},
        {"group_id": "group_sleep", "name": "Sleep Training Circle", "description": "Help with baby sleep training", "theme": "sleep_training", "members": [], "is_private": False},
        {"group_id": "group_firsttime", "name": "First Time Moms", "description": "Support group for first-time mothers", "theme": "first_time_moms", "members": [], "is_private": False}
    ]
    
    for group in groups_data:
        group["created_at"] = datetime.now(timezone.utc)
        await db.support_groups.update_one(
            {"group_id": group["group_id"]},
            {"$setOnInsert": group},
            upsert=True
        )
    
    # Resources
    resources_data = [
        {"resource_id": "res_001", "title": "Understanding Early Pregnancy Symptoms", "content": "A comprehensive guide to early pregnancy symptoms...", "resource_type": "article", "category": "pregnancy", "author": "Dr. Sarah Johnson", "tags": ["pregnancy", "symptoms"], "is_premium": False},
        {"resource_id": "res_002", "title": "Preparing for Labor and Delivery", "content": "Everything you need to know about labor...", "resource_type": "guide", "category": "childbirth", "author": "Dr. Emily Chen", "tags": ["childbirth", "labor"], "is_premium": False},
        {"resource_id": "res_003", "title": "Postpartum Recovery Tips", "content": "Essential tips for postpartum recovery...", "resource_type": "article", "category": "postpartum", "author": "Dr. Maria Rodriguez", "tags": ["postpartum", "recovery"], "is_premium": False},
        {"resource_id": "res_004", "title": "Baby's First Year Milestones", "content": "Track your baby's development milestones...", "resource_type": "guide", "category": "baby_milestones", "author": "Dr. James Lee", "tags": ["milestones", "development"], "is_premium": False},
        {"resource_id": "res_005", "title": "Advanced Nutrition During Pregnancy", "content": "Premium guide to pregnancy nutrition...", "resource_type": "guide", "category": "pregnancy", "author": "Dr. Sarah Johnson", "tags": ["pregnancy", "nutrition"], "is_premium": True}
    ]
    
    for resource in resources_data:
        resource["created_at"] = datetime.now(timezone.utc)
        await db.resources.update_one(
            {"resource_id": resource["resource_id"]},
            {"$setOnInsert": resource},
            upsert=True
        )
    
    return {"message": "Data seeded successfully"}


# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
