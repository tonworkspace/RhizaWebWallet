# 🐦 Twitter API Integration for Airdrop Verification

## 📚 **Recommended Libraries**

### **1. Primary Choice: `twitter-api-v2`**
```bash
npm install twitter-api-v2
```
- ✅ **Most comprehensive** Twitter API v2 library
- ✅ **TypeScript support** built-in
- ✅ **Rate limiting** handling
- ✅ **All endpoints** supported (tweets, users, follows, etc.)
- ✅ **Active maintenance** and community

### **2. Alternative: `twit`** (Legacy but stable)
```bash
npm install twit
npm install @types/twit
```
- ✅ **Stable and mature**
- ⚠️ Uses older API v1.1 (still works)
- ⚠️ Less features than v2

### **3. Backend Option: `node-twitter-api-v2`**
```bash
npm install node-twitter-api-v2
```
- ✅ **Server-side only** (more secure)
- ✅ **Full API access**
- ❌ **Requires backend** implementation

## 🔑 **Twitter API Requirements**

### **API Access Levels**
| Level | Cost | Features | Best For |
|-------|------|----------|----------|
| **Free** | $0/month | Basic read access, 1,500 tweets/month | Testing |
| **Basic** | $100/month | Read/write, 50,000 tweets/month | Small projects |
| **Pro** | $5,000/month | Full access, 300,000 tweets/month | Production |

### **Required Permissions**
- ✅ **Read tweets** (verify retweets)
- ✅ **Read users** (verify follows)
- ✅ **Read relationships** (check if user follows account)
- ⚠️ **Write access** (for posting - optional)

## 🛠️ **Implementation Options**

### **Option 1: Frontend-Only (Limited)**
```typescript
// Limited to public data only
// Cannot verify private follows/retweets
// Good for: Public tweet verification
```

### **Option 2: Backend + Frontend (Recommended)**
```typescript
// Backend handles API calls with credentials
// Frontend sends verification requests
// Good for: Full verification capabilities
```

### **Option 3: Serverless Functions**
```typescript
// Vercel/Netlify functions handle API calls
// No dedicated backend needed
// Good for: Cost-effective solution
```

## 🎯 **Recommended Approach**

### **Phase 1: Basic Implementation**
1. **Use `twitter-api-v2`** library
2. **Backend API endpoint** for verification
3. **Verify public actions** (retweets, mentions)
4. **Store verification results** in database

### **Phase 2: Advanced Features**
1. **Follow verification** (requires user auth)
2. **Real-time webhooks** for instant verification
3. **Batch verification** for multiple users
4. **Rate limiting** and caching

## 💡 **Alternative Solutions**

### **If Twitter API is too expensive:**

#### **1. Manual Verification**
- User submits **screenshot** or **tweet URL**
- **Manual review** process
- **Lower cost** but more work

#### **2. Social Login Integration**
- User **connects Twitter account**
- **OAuth verification** of actions
- **More user-friendly** but complex setup

#### **3. Hybrid Approach**
- **Automated** for simple tasks (public tweets)
- **Manual review** for complex tasks (follows)
- **Cost-effective** balance

## 🚀 **Quick Start Implementation**

### **1. Install Dependencies**
```bash
npm install twitter-api-v2 dotenv
```

### **2. Environment Variables**
```env
TWITTER_API_KEY=your_api_key
TWITTER_API_SECRET=your_api_secret
TWITTER_BEARER_TOKEN=your_bearer_token
TWITTER_ACCESS_TOKEN=your_access_token
TWITTER_ACCESS_SECRET=your_access_secret
```

### **3. Basic Service Setup**
```typescript
// services/twitterVerificationService.ts
import { TwitterApi } from 'twitter-api-v2';

class TwitterVerificationService {
  private client: TwitterApi;

  constructor() {
    this.client = new TwitterApi({
      appKey: process.env.TWITTER_API_KEY!,
      appSecret: process.env.TWITTER_API_SECRET!,
      accessToken: process.env.TWITTER_ACCESS_TOKEN!,
      accessSecret: process.env.TWITTER_ACCESS_SECRET!,
    });
  }

  // Verify if user retweeted specific tweet
  async verifyRetweet(userId: string, tweetId: string): Promise<boolean> {
    try {
      const retweets = await this.client.v2.tweetRetweetedBy(tweetId);
      return retweets.data?.some(user => user.id === userId) || false;
    } catch (error) {
      console.error('Retweet verification error:', error);
      return false;
    }
  }

  // Verify if user follows account
  async verifyFollow(userId: string, targetUserId: string): Promise<boolean> {
    try {
      const following = await this.client.v2.following(userId);
      return following.data?.some(user => user.id === targetUserId) || false;
    } catch (error) {
      console.error('Follow verification error:', error);
      return false;
    }
  }

  // Verify if user posted about topic
  async verifyMention(userId: string, keywords: string[]): Promise<boolean> {
    try {
      const tweets = await this.client.v2.userTimeline(userId, {
        max_results: 10,
        'tweet.fields': ['text', 'created_at']
      });
      
      return tweets.data?.some(tweet => 
        keywords.some(keyword => 
          tweet.text.toLowerCase().includes(keyword.toLowerCase())
        )
      ) || false;
    } catch (error) {
      console.error('Mention verification error:', error);
      return false;
    }
  }
}

export const twitterVerificationService = new TwitterVerificationService();
```

## 📊 **Cost Analysis**

### **Twitter API Costs**
- **Free Tier**: 1,500 tweets/month (good for testing)
- **Basic Tier**: $100/month (50,000 tweets/month)
- **Estimated Usage**: ~10 verifications per user = 500 users max on Basic

### **Alternative Costs**
- **Manual Review**: $5-10/hour for moderator
- **Screenshot Verification**: Free but time-consuming
- **Social Login**: Development time but no API costs

## 🎯 **Recommendation**

### **For MVP/Testing:**
1. **Start with Free Twitter API** (1,500 requests/month)
2. **Implement basic retweet verification**
3. **Use manual review** for follows
4. **Upgrade to Basic** ($100/month) when needed

### **For Production:**
1. **Twitter API Basic** ($100/month)
2. **Automated verification** for retweets/mentions
3. **Manual review** for high-value tasks
4. **Consider Pro tier** ($5,000/month) for scale

Would you like me to implement the Twitter verification service with the `twitter-api-v2` library?