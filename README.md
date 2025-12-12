# Roomate

A comprehensive roommate coordination app with shared expenses, shopping lists, calendar, and goals.

## Project Structure

```
/roomate/
  backend/          # Node.js + Express + TypeScript + MongoDB backend
  mobile/           # React Native (Expo) + TypeScript mobile app
```

## Backend Setup

1. Navigate to the backend directory:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file based on `.env.example`:
```bash
cp .env.example .env
```

4. Configure your `.env` file:
- `MONGODB_URI`: Your MongoDB connection string
- `JWT_SECRET`: A secret key for JWT tokens
- `SENDGRID_API_KEY`: Your SendGrid API key for email verification
- `SENDGRID_FROM_EMAIL`: **Your verified SendGrid sender email** (must be verified in SendGrid dashboard)
- `BACKEND_PUBLIC_URL`: Your backend URL (e.g., `http://localhost:3000`)
- `FRONTEND_URL`: Your frontend URL (e.g., `http://localhost:19006`)

**Important:** The `SENDGRID_FROM_EMAIL` must be a verified sender in your SendGrid account. To verify:
1. Go to SendGrid Dashboard → Settings → Sender Authentication
2. Verify a Single Sender or Domain
3. Use that verified email address as `SENDGRID_FROM_EMAIL`

5. Start the development server:
```bash
npm run dev
```

The backend will run on `http://localhost:3000` by default.

## Mobile App Setup

1. Navigate to the mobile directory:
```bash
cd mobile
```

2. Install dependencies:
```bash
npm install
```

3. Update the API base URL in `src/api/apiClient.ts` if needed (defaults to `http://localhost:3000` for development).

4. Start the Expo development server:
```bash
npm start
```

5. Scan the QR code with the Expo Go app on your phone, or press `i` for iOS simulator / `a` for Android emulator.

## Features

### Backend
- ✅ User authentication with JWT
- ✅ Email verification via SendGrid
- ✅ Household management with join codes
- ✅ Expense tracking with flexible splitting (even or manual)
- ✅ Settlement tracking for manual settle-ups
- ✅ Shopping list with shared/personal items
- ✅ Calendar events (bills, cleaning, social, other)
- ✅ Goals board with status tracking and upvotes
- ✅ Balance calculation utility

### Mobile App
- ✅ Authentication screens (Login/Signup)
- ✅ Household selection and creation
- ✅ Home dashboard with overview
- ✅ Expense management with create/edit
- ✅ Settle-up flow with external payment sharing
- ✅ Shopping list with voice input (MVP placeholder)
- ✅ Calendar with event management
- ✅ Goals board with status management
- ✅ Settings with household management

## API Endpoints

### Auth
- `POST /auth/signup` - Create account
- `POST /auth/login` - Login
- `GET /auth/me` - Get current user
- `GET /auth/verify-email?token=...` - Verify email
- `POST /auth/resend-verification` - Resend verification email

### Households
- `GET /households` - Get user's households
- `POST /households` - Create household
- `POST /households/join` - Join household with code
- `GET /households/:id` - Get household details
- `POST /households/:id/leave` - Leave household

### Expenses
- `GET /expenses/household/:householdId` - Get expenses
- `GET /expenses/household/:householdId/balances` - Get balances
- `POST /expenses` - Create expense
- `DELETE /expenses/:id` - Delete expense

### Settlements
- `GET /settlements/household/:householdId` - Get settlements
- `POST /settlements` - Create settlement

### Shopping
- `GET /shopping/household/:householdId` - Get items
- `POST /shopping` - Create item
- `PATCH /shopping/:id` - Update item
- `DELETE /shopping/:id` - Delete item

### Goals
- `GET /goals/household/:householdId` - Get goals
- `POST /goals` - Create goal
- `PATCH /goals/:id` - Update goal
- `POST /goals/:id/upvote` - Toggle upvote

### Events
- `GET /events/household/:householdId` - Get events
- `POST /events` - Create event
- `DELETE /events/:id` - Delete event

## Notes

- **Payments**: No real payment processing. Settlements are for tracking only. "Pay externally" opens a share sheet.
- **Email Verification**: Requires SendGrid API key. Update the sender email in `backend/src/config/mail.ts`.
- **Voice Input**: Currently a placeholder. In production, integrate with a speech recognition library or service.
- **Expense Validation**: Backend strictly validates that share amounts sum to total amount.

## Development

- Backend uses `ts-node-dev` for hot reloading
- Mobile app uses Expo for development
- Both use TypeScript for type safety

## License

ISC

