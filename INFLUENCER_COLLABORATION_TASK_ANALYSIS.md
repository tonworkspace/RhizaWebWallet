# Influencer Collaboration Task - How It Works

## Task Overview

The **Influencer Collaboration** task is one of the most challenging and rewarding tasks in the RhizaCore airdrop system, designed to leverage social media influence for organic growth.

### Task Details
- **Task ID**: 19
- **Title**: "Influencer Collaboration"
- **Description**: "Get a crypto influencer to mention or share RhizaCore"
- **Reward**: 1,000 RZC (highest reward in the system)
- **Category**: Growth
- **Difficulty**: Expert
- **Time Limit**: 30 days
- **Verification**: Manual review required

### Requirements
```json
{
  "min_followers": 1000,
  "platforms": ["twitter", "youtube", "instagram", "tiktok"]
}
```

## How It Works

### 1. Task Initiation
When a user clicks on the "Influencer Collaboration" task:

```typescript
case 'influencer_collab':
  showToast('Collaborate with crypto influencers to promote RZC and then click "Verify"', 'info');
  break;
```

The user receives guidance to:
- Find crypto influencers with 1K+ followers
- Collaborate with them to promote RhizaCore
- Get them to mention or share RZC content
- Submit proof for manual verification

### 2. Verification Process

#### Step 1: User Clicks "Collaborate" Button
- Opens the Social Media Verification Modal
- Task is identified as requiring manual proof submission

#### Step 2: Proof Submission
The user must provide:

**Required Information**:
- **Description**: Detailed explanation of the collaboration
- **Proof Files**: Screenshots, videos, or documents showing:
  - The influencer's content mentioning RhizaCore
  - Evidence of the collaboration agreement
  - Proof of the influencer's follower count (1K+ requirement)
  - Platform where the content was shared

**Supported Platforms**:
- Twitter/X
- YouTube
- Instagram
- TikTok

#### Step 3: Manual Review Process
```typescript
const submissionResult = await this.manualService.submitProofForReview(
  userWallet,
  verificationData.proofData.taskId,
  'influencer_collab',
  verificationData.proofData
);
```

The submission goes to admin review where:
- Admins verify the influencer has 1K+ followers
- Check that RhizaCore/RZC was genuinely mentioned
- Validate the collaboration is authentic
- Ensure content quality meets standards

### 3. Admin Review Criteria

Admins evaluate submissions based on:

**Influencer Verification**:
- ✅ Minimum 1,000 followers on the platform
- ✅ Active, engaged audience
- ✅ Crypto/blockchain niche relevance
- ✅ Authentic account (not bot/fake followers)

**Content Quality**:
- ✅ Genuine mention of RhizaCore/RZC
- ✅ Positive or neutral sentiment
- ✅ Clear visibility to the influencer's audience
- ✅ Professional presentation

**Collaboration Evidence**:
- ✅ Proof of direct collaboration (not just organic mention)
- ✅ Screenshots of communication/agreement
- ✅ Content published within the 30-day timeframe
- ✅ Proper attribution and links (if applicable)

### 4. Reward Distribution

Upon approval:
- User receives 1,000 RZC (highest task reward)
- Task marked as completed
- Success notification sent
- RZC credited to user's wallet balance

## User Journey Example

### Scenario: Successful Influencer Collaboration

1. **Discovery**: User sees the high-reward influencer task (1,000 RZC)

2. **Planning**: User identifies potential crypto influencers:
   - Twitter crypto analysts with 5K+ followers
   - YouTube crypto channels with 10K+ subscribers
   - Instagram crypto educators with 2K+ followers

3. **Outreach**: User contacts influencers:
   - Explains RhizaCore project
   - Proposes collaboration (paid post, review, mention)
   - Negotiates terms and content requirements

4. **Execution**: Influencer creates content:
   - Twitter thread about RZC utility
   - YouTube video reviewing RhizaCore features
   - Instagram post about the project

5. **Documentation**: User collects proof:
   - Screenshots of the published content
   - Evidence of influencer's follower count
   - Communication records showing collaboration
   - Links to the published content

6. **Submission**: User submits through verification modal:
   - Uploads proof files (images, videos, PDFs)
   - Provides detailed description
   - Includes all relevant links and information

7. **Review**: Admin evaluates submission:
   - Verifies influencer meets follower requirement
   - Checks content quality and authenticity
   - Validates collaboration evidence

8. **Approval**: If approved:
   - User receives 1,000 RZC reward
   - Task marked as completed
   - Success notification displayed

## Technical Implementation

### Database Storage
```sql
-- Task definition in airdrop_tasks table
INSERT INTO airdrop_tasks (
  id, title, description, reward, action, category, difficulty,
  is_active, instructions, time_limit, verification_type, requirements
) VALUES (
  19, 'Influencer Collaboration', 
  'Get a crypto influencer to mention or share RhizaCore', 
  1000, 'influencer_collab', 'growth', 'expert', TRUE,
  'Collaborate with influencers (1K+ followers) to promote RZC', 
  '30 days', 'manual', 
  '{"min_followers": 1000, "platforms": ["twitter", "youtube", "instagram", "tiktok"]}'
);
```

### Verification Flow
```typescript
// 1. Task action triggers info message
case 'influencer_collab':
  showToast('Collaborate with crypto influencers to promote RZC and then click "Verify"', 'info');

// 2. Verification requires manual proof
case 'influencer_collab':
  if (!verificationData?.proofData) {
    return {
      success: false,
      requiresManualReview: true,
      message: 'This task requires manual verification. Please provide proof of completion.'
    };
  }

// 3. Submission for admin review
const submissionResult = await this.manualService.submitProofForReview(
  userWallet, taskId, 'influencer_collab', proofData
);
```

## Success Metrics

Based on the database setup, the influencer collaboration task has:
- **8 completions** (showing it's challenging but achievable)
- **High reward** (1,000 RZC) reflecting the difficulty and value
- **30-day timeframe** allowing sufficient time for outreach and execution

## Best Practices for Users

### Finding Influencers
1. **Research**: Use tools like Social Blade, Twitter Analytics
2. **Relevance**: Focus on crypto/blockchain niche influencers
3. **Engagement**: Look for high engagement rates, not just follower count
4. **Authenticity**: Avoid influencers with suspicious follower patterns

### Collaboration Approach
1. **Professional**: Present RhizaCore professionally with clear value proposition
2. **Mutual Benefit**: Offer fair compensation or value exchange
3. **Clear Terms**: Define exactly what content is needed
4. **Timeline**: Respect the 30-day task deadline

### Proof Documentation
1. **Comprehensive**: Include all relevant screenshots and evidence
2. **Clear**: Ensure proof clearly shows the collaboration and results
3. **Organized**: Present evidence in a logical, easy-to-review format
4. **Complete**: Don't leave gaps that might cause rejection

## Why This Task Exists

The influencer collaboration task serves multiple strategic purposes:

1. **Organic Growth**: Leverages established audiences for authentic promotion
2. **Credibility**: Influencer endorsements add legitimacy to the project
3. **Reach Expansion**: Accesses new user segments through influencer networks
4. **Content Creation**: Generates valuable promotional content
5. **Community Building**: Attracts engaged users who trust the influencer

The high reward (1,000 RZC) reflects the significant value this task brings to the RhizaCore ecosystem through authentic, high-quality promotion by trusted voices in the crypto community.