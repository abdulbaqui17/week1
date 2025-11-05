# Quick Test Guide - Authentication System

## 🚀 Testing Steps

### 1. Open the Application
```
http://localhost
```

You should see a beautiful landing page with:
- Hero section: "Trade Crypto with Leverage"
- Features grid: $5,000 starting balance, 100x leverage, real-time trading, security
- Supported assets: BTC, ETH, SOL
- "Get Started Free" and "Sign In" buttons

### 2. Test Sign Up Flow

1. Click **"Get Started Free"** or **"Sign Up"** button
2. You'll see a signup form
3. Enter:
   - **Email**: test@example.com (or any email)
   - **Password**: password123 (minimum 6 characters)
   - **Confirm Password**: password123
4. Click **"Sign up"** button

**Expected Result**:
- ✅ Account created successfully
- ✅ You get $5,000 starting balance automatically
- ✅ Redirected to `/dashboard` (trading platform)
- ✅ Header shows your email address
- ✅ Balance displays $5,000

### 3. Test Trading (Authenticated)

Once on the dashboard:

1. **Check Balance**: Top right should show "Equity 5000.00", "Free 5000.00"
2. **Place an Order**:
   - Select symbol (BTC/ETH/SOL)
   - Choose BUY or SELL
   - Enter volume (e.g., 0.01)
   - Click "Place Order"

**Expected Result**:
- ✅ Order should be placed successfully
- ✅ Position appears in positions panel
- ✅ Balance updates (margin used)
- ✅ Order is saved to database under your user account

### 4. Test Logout

1. Click the **Logout icon** (door with arrow) in the top right header
2. **Expected Result**:
   - ✅ Redirected to signin page
   - ✅ Token cleared from localStorage
   - ✅ Cannot access dashboard without auth

### 5. Test Sign In (Returning User)

1. From signin page, enter:
   - **Email**: test@example.com (the account you just created)
   - **Password**: password123
2. Click **"Sign in"**

**Expected Result**:
- ✅ Successfully logged in
- ✅ Redirected to dashboard
- ✅ Your previous positions still visible
- ✅ Balance matches what you had before logout

### 6. Test Protected Routes

Try to access dashboard without login:
1. Logout if logged in
2. Manually navigate to `http://localhost/dashboard`

**Expected Result**:
- ✅ Automatically redirected to `/signin`
- ✅ Cannot access trading without authentication

### 7. Test Multiple Users

1. Logout
2. Sign up with a different email: test2@example.com
3. **Expected Result**:
   - ✅ New user gets separate $5,000 balance
   - ✅ No positions from previous user
   - ✅ Completely isolated account

### 8. Verify Database

Check users table:
```bash
docker exec -it week1-postgres-1 psql -U postgres -d xness -c "SELECT id, email, balance, created_at FROM users;"
```

**Expected Result**:
```
 id |       email        | balance |         created_at         
----+--------------------+---------+----------------------------
  1 | test@example.com   |  5000   | 2025-10-26 ...
  2 | test2@example.com  |  5000   | 2025-10-26 ...
```

Check orders table (after placing orders):
```bash
docker exec -it week1-postgres-1 psql -U postgres -d xness -c "SELECT id, user_id, symbol, side, volume, status FROM orders LIMIT 5;"
```

**Expected Result**:
```
       id        | user_id |  symbol   | side |  volume  | status 
-----------------+---------+-----------+------+----------+--------
 1730000000-abc  |       1 | BTCUSDT   | BUY  | 0.010000 | OPEN
```

## 🐛 Troubleshooting

### Issue: "Cannot find module 'react-router-dom'"
**Solution**: This is just a TypeScript error. The app will work fine as the dependencies are installed.

### Issue: "Unauthorized" when placing orders
**Solution**: 
- Make sure you're logged in
- Check browser console for auth token
- Try logout and login again

### Issue: Balance not showing $5,000
**Solution**:
- Check database: User should have balance = 5000
- Refresh the page
- Check browser console for API errors

### Issue: Orders not appearing
**Solution**:
- Make sure you're logged in with the correct account
- Check browser network tab for 401 errors
- Verify token is being sent in Authorization header

## ✅ Success Criteria

You've successfully tested the authentication system if:

- [ ] Landing page loads with features showcase
- [ ] Can create new account with signup form
- [ ] New users get exactly $5,000 starting balance
- [ ] Dashboard is protected (requires login)
- [ ] Can place orders when authenticated
- [ ] Orders are saved to database with user_id
- [ ] Can logout successfully
- [ ] Can signin with existing account
- [ ] Previous orders/balance persists after logout/login
- [ ] Multiple users have isolated accounts
- [ ] Database correctly stores users and orders

## 📊 Check Service Logs

If something doesn't work, check the logs:

```bash
# Check all services
docker-compose logs -f

# Check specific service
docker-compose logs -f httpserver
docker-compose logs -f client
```

## 🎯 Key Features Verified

1. ✅ **Authentication**: Signup, signin, logout with JWT
2. ✅ **$5,000 Starting Balance**: Every new user automatically gets it
3. ✅ **Protected Routes**: Cannot trade without login
4. ✅ **User Isolation**: Each user has their own account
5. ✅ **Order Protection**: Can only place orders when authenticated
6. ✅ **Database Persistence**: Users and orders stored in PostgreSQL
7. ✅ **Beautiful UI**: Landing page, forms, dashboard all styled

## 🔐 Security Notes

- Passwords are hashed with bcrypt (10 rounds)
- JWT tokens expire after 7 days
- Tokens stored in localStorage (consider httpOnly cookies for production)
- All trading endpoints require valid auth token
- Users can only access their own data
