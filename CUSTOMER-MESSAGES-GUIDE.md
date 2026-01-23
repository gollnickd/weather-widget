# 📢 Customer Messages Feature - Complete Guide

## Overview:
Customers can now post custom messages that display in their widget! Perfect for announcements, promotions, and real-time updates.

---

## 🎯 What This Feature Does:

### For Customers:
- ✅ Post messages from their phone (responsive mobile interface)
- ✅ Choose from quick post templates OR custom message
- ✅ Set auto-expiration (minutes, hours, or end of day)
- ✅ Add call-to-action (phone number or website)
- ✅ View active messages and analytics
- ✅ Remove messages anytime

### For Widget Visitors:
- ✅ See customer messages displayed prominently in widget
- ✅ Click to call or visit website (if CTA set)
- ✅ Messages auto-expire at specified time

---

## 📱 Mobile Interface URL:

```
https://your-domain.com/customer/post-message.html?key=CUSTOMER_API_KEY
```

**Features:**
- ⚡ Quick post templates (8 preset messages)
- ✏️ Custom message option (up to 255 characters)
- ⏰ Expiration options (minutes, hours, end of day)
- 🔗 Optional CTA (phone or website)
- 📊 View active messages with analytics
- 🗑️ Remove messages instantly

---

## 🗄️ Database Schema:

### Tables Created:

#### `customer_messages`
Stores all customer messages with:
- Message content and type
- Expiration settings
- Call to action
- View/click tracking
- Active/expired status

#### `message_templates`
Preset quick post messages:
1. "Last-minute opening today!"
2. "Beginner-friendly lesson in protected water"
3. "Wind picked up—call us for best session time"
4. "BOGO Tuesday today!"
5. "1 spot left—call now!"
6. "Perfect calm conditions today!"
7. "Drop-in lessons available now"
8. "Group discount today only"

---

## 🚀 Setup & Deployment:

### Step 1: Run Database Migration
```sql
-- Run the schema from:
database/customer-messages-schema.sql

-- This creates:
-- customer_messages table
-- message_templates table
-- active_customer_messages view
```

### Step 2: Deploy Code
**Files added/modified:**
- `backend/server.js` (message API endpoints)
- `frontend/widget.js` (message display)
- `customer/post-message.html` (mobile interface)
- `database/customer-messages-schema.sql`

### Step 3: Test
1. Get customer API key
2. Visit: `/customer/post-message.html?key=API_KEY`
3. Post a message
4. Check widget - message should appear!

---

## 📊 Widget Display:

### Message Appears:
```
┌─────────────────────────────────────┐
│        Perfect Paddles    🌊        │
├─────────────────────────────────────┤
│         BEGINNER FRIENDLY           │
│    Calm conditions - Perfect!       │
├─────────────────────────────────────┤
│  📢                                 │
│  Last-minute opening today!         │
│  📞 Tap to call →                   │
├─────────┬─────────┬─────────────────┤
│  Wind   │  Waves  │      Temp       │
│ 12 mph  │  0 ft   │      57°F       │
└─────────┴─────────┴─────────────────┘
```

### Message Positioning:
- Appears **between** condition indicator and weather details
- Eye-catching design (semi-transparent white box)
- Clickable if CTA is set
- Tracks views and clicks

---

## 🎨 Message Types:

### 1. Quick Posts (Templates)
Pre-written messages for common situations:
- Select from list
- One tap to post
- Professional wording
- Fastest option

### 2. Custom Messages
Write your own:
- Up to 255 characters
- Live character count
- Preview before posting
- Full flexibility

---

## ⏰ Expiration Options:

### 1. End of Day (Default)
- Expires at 11:59 PM today
- Perfect for daily specials
- Most common option

### 2. Custom Hours
- Set 1-24 hours
- Good for events
- Example: "3 hours" = expires in 3 hours

### 3. Custom Minutes
- Set any number of minutes
- Good for flash sales
- Example: "30 minutes" = expires in 30 min

**Auto-Expiration:**
- Cron job runs hourly
- Marks expired messages as inactive
- Widget automatically stops showing them

---

## 🔗 Call to Action Options:

### 1. None
- Just display message
- No clickable action
- Information only

### 2. Phone Number
- Click to call
- Opens phone dialer
- Example: (555) 123-4567
- Mobile: `tel:` link

### 3. Website URL
- Click to visit
- Opens in new tab
- Example: https://example.com/special
- Tracked clicks

---

## 📈 Analytics Tracked:

### View Count
- Increments each time message is displayed in widget
- Helps measure reach
- Shown in active messages list

### Click Count
- Increments when CTA is clicked
- Measures engagement
- Helps evaluate effectiveness

**Tracking is automatic** - no setup needed!

---

## 🔌 API Endpoints:

### Public:
```
GET  /api/message-templates
     Returns list of quick post templates
```

### Customer Auth (requires X-API-Key header):
```
POST   /api/customer/post-message
       Create new message

GET    /api/customer/messages
       Get customer's active messages

DELETE /api/customer/messages/:id
       Remove a message
```

### Widget (public):
```
POST /api/messages/:id/view
     Track message view

POST /api/messages/:id/click
     Track message click
```

---

## 💡 Use Cases:

### Daily Specials:
- "BOGO Tuesday today!"
- Expires: End of day
- CTA: Website (booking page)

### Last-Minute Availability:
- "1 spot left—call now!"
- Expires: 2 hours
- CTA: Phone number

### Weather Updates:
- "Wind picked up—call us for best session time"
- Expires: 30 minutes
- CTA: Phone number

### Promotions:
- "Group discount today only"
- Expires: End of day
- CTA: Website (promo details)

### Lessons:
- "Beginner-friendly lesson in protected water"
- Expires: 3 hours
- CTA: Phone to book

---

## 🎯 Mobile Interface Features:

### Design:
- Responsive (works on all phones)
- Large touch targets
- Clear visual feedback
- Fast loading
- Works offline (cached)

### Quick Post Selection:
- Tap to select
- Highlighted when selected
- Or tap "Custom Message"

### Expiration:
- 3 easy buttons (End of Day, Hours, Minutes)
- Custom duration input appears when needed
- Clear labeling

### CTA:
- 3 buttons (None, Phone, Website)
- Input appears only when needed
- Phone formatting guidance
- URL validation

### Preview:
- Live preview of message
- Shows how it'll look in widget
- Updates as you type

### Active Messages:
- List of current messages
- Shows views and clicks
- One-tap removal
- Expiration time displayed

---

## 🔒 Security:

### Authentication:
- API key required (X-API-Key header)
- Validates customer ownership
- Only customer can manage their messages

### Input Validation:
- Max 255 characters
- HTML escaped (prevents XSS)
- SQL injection protected
- Phone/URL format checked

### Rate Limiting:
- Standard API rate limits apply
- Prevents abuse
- Per-IP tracking

---

## 🧪 Testing:

### Test Message Posting:
1. Get customer API key from admin
2. Visit `/customer/post-message.html?key=API_KEY`
3. Select quick post OR enter custom
4. Set expiration
5. Optional: Add CTA
6. Click "Post Message"
7. Should see success alert

### Test Widget Display:
1. Open widget on test page
2. Should see message appear
3. Click message (if CTA set)
4. Should open phone/website

### Test Expiration:
1. Post message with 1 minute expiration
2. Wait 1 minute
3. Cron job expires it (runs hourly)
4. OR manually run: `UPDATE customer_messages SET is_expired = TRUE WHERE expires_at <= NOW()`
5. Widget refresh - message gone

### Test Analytics:
1. Post message
2. View widget multiple times
3. Click CTA
4. Check active messages
5. Should show view/click counts

---

## 📋 Customer Instructions:

**To give to your customers:**

```
How to Post Messages to Your Widget:

1. Visit: https://your-domain.com/customer/post-message.html?key=YOUR_API_KEY
   (Bookmark this link on your phone!)

2. Choose message type:
   - Tap a quick post template, OR
   - Tap "Custom Message" to write your own

3. Set when it expires:
   - "End of Day" (default) - expires at midnight
   - "Custom Hours" - enter number of hours
   - "Custom Minutes" - enter number of minutes

4. Optional - Add call to action:
   - "Phone" - visitors can tap to call you
   - "Website" - visitors can tap to visit a link
   - "None" - just show the message

5. Tap "Post Message"

6. Message appears in your widget immediately!

7. To remove: Scroll down, tap "Remove" on any active message
```

---

## 🎨 Customization Options:

### Message Styling:
Currently: Semi-transparent white box with emoji
Can customize in `widget.js`:
- Colors
- Border style
- Font size
- Icons

### Templates:
Add more templates in database:
```sql
INSERT INTO message_templates (template_name, message_text, display_order)
VALUES ('custom_template', 'Your message here', 9);
```

### Expiration Defaults:
Change default in `post-message.html`:
- Default is "End of Day"
- Can change to hours/minutes

---

## 🆘 Troubleshooting:

### Message Not Showing in Widget:
1. Check message is active: `SELECT * FROM customer_messages WHERE is_active = TRUE`
2. Check expiration: `WHERE expires_at > NOW()`
3. Check customer_id matches
4. Check widget is fetching latest data
5. Hard refresh widget page

### Can't Post Message:
1. Check API key is correct
2. Check API key in URL: `?key=YOUR_KEY`
3. Check customer is active in database
4. Check browser console for errors
5. Check backend logs

### CTA Not Working:
1. Check phone format: Should be digits with optional formatting
2. Check URL format: Must start with http:// or https://
3. Check widget click tracking in network tab
4. Check cta_value in database is correct

### Expiration Not Working:
1. Cron job runs hourly - wait up to 1 hour
2. Manually expire: `UPDATE customer_messages SET is_expired = TRUE WHERE expires_at <= NOW()`
3. Check server timezone matches expected
4. Check expires_at value in database

---

## 📊 Database Queries:

### See All Active Messages:
```sql
SELECT * FROM active_customer_messages;
```

### See Messages for Specific Customer:
```sql
SELECT * FROM customer_messages 
WHERE customer_id = 1 
ORDER BY created_at DESC;
```

### See Message Analytics:
```sql
SELECT 
  message_text,
  view_count,
  click_count,
  ROUND(click_count / view_count * 100, 2) as ctr_percent
FROM customer_messages
WHERE view_count > 0
ORDER BY click_count DESC;
```

### Manually Expire Old Messages:
```sql
UPDATE customer_messages 
SET is_expired = TRUE 
WHERE expires_at <= NOW() AND is_expired = FALSE;
```

---

## ✅ Summary:

**Feature:** Customer Messages
**Access:** Mobile-friendly web interface
**Auth:** Customer API key
**Message Types:** Quick posts or custom (255 chars max)
**Expiration:** Minutes, hours, or end of day
**CTA:** Phone, website, or none
**Display:** Prominent in widget between condition and weather
**Analytics:** View and click tracking
**Management:** Post, view, and remove anytime

**Perfect for:**
- 📢 Announcements
- 🎁 Promotions
- ⏰ Last-minute availability
- 🌤️ Weather updates
- 🏫 Lesson availability

---

**Deploy, test, and give customers the URL to start posting!** 📢
