# Care Home Management System

A modern, comprehensive management system for care homes and old age facilities built with React, TypeScript, and Supabase. Features complete resident management, payment tracking, document storage, and multi-admin support.

## 🌟 Features

### Core Management
- **Resident Management**: Complete profiles with photos, medical details, emergency contacts, and status tracking
- **Room Management**: Room assignments, availability tracking, and occupancy management
- **Payment Tracking**: Record payments with automatic receipt generation (PDF), extra charges billing, and WhatsApp sharing
- **Document Management**: Secure document storage with Google Drive integration and resident-wise folder organization
- **Food Menu**: Weekly meal planning and management
- **Reminders**: Birthday alerts, payment reminders, and custom task tracking
- **Dashboard**: Real-time statistics, alerts, and quick actions

### Admin Features
- **Multi-Admin Support**: Super admin can invite other admins via email
- **Role-Based Access**: Super admin (full access + Drive connection) and Admin (full access, no Drive)
- **Admin Management**: Invite, view, and remove admin users from Settings
- **Password Reset**: Email-based password reset flow
- **Mobile Responsive**: Optimized for mobile, tablet, and desktop devices

### Document & Payment Features
- **Professional PDF Receipts**: Beautiful, branded payment receipts with itemized charges
- **Extra Charges Tracking**: Medicine, doctor visits, and other category-based charges
- **Google Drive Backup**: Automatic document backup with resident-specific folders
- **WhatsApp Integration**: Share receipts directly via WhatsApp
- **Bulk Photo Management**: Fix and update multiple resident photos at once

## 🚀 Technology Stack

- **Frontend**: React 18, TypeScript, Vite
- **Styling**: Tailwind CSS, shadcn/ui components
- **Backend**: Supabase (PostgreSQL, Authentication, Edge Functions)
- **File Storage**: Google Drive API (OAuth 2.0)
- **PDF Generation**: jsPDF
- **State Management**: React Context API
- **Routing**: React Router v6

## 📱 Mobile Optimization

The entire application is fully responsive and optimized for:
- **Mobile**: 320px and up (optimized touch targets, stacked layouts)
- **Tablet**: 768px and up (grid layouts, side-by-side elements)
- **Desktop**: 1024px and up (full multi-column layouts)

Key mobile features:
- Hamburger navigation menu
- Touch-friendly buttons and controls
- Proper text truncation and overflow handling
- Responsive cards and grids
- Fixed mobile header with content padding

## 🔐 User Roles & Authentication

### Super Admin
- First user to sign up automatically becomes super admin
- Can invite other admins via email
- Can connect/manage Google Drive integration
- Full access to all features
- Can remove other admins (except other super admins)

### Admin
- Invited by super admin via email invitation
- Must set password on first login via secure link
- Full application access (residents, payments, documents, etc.)
- Cannot connect Google Drive (reserved for super admin)
- Cannot access admin management features

### Authentication Flow
1. **First User**: Sign up → Automatically assigned super admin role
2. **Subsequent Users**: Must be invited by super admin → Receive email → Set password → Login
3. **Password Reset**: Available from login page → Email link → Reset password

## 📄 Google Drive Integration

Documents are automatically organized in the super admin's Google Drive account.

### Folder Structure
```
My Drive/
└── Residents-Documents/
    ├── John Doe/
    │   ├── aadhaar_1734567890123.pdf
    │   ├── prescription_1734567891234.pdf
    │   ├── medical_report_1734567892345.pdf
    │   └── ...
    ├── Jane Smith/
    │   ├── pan_1734567893456.pdf
    │   ├── discharge_summary_1734567894567.pdf
    │   └── ...
    └── ...
```

### Document Categories
- Aadhaar Card
- PAN Card
- Medical Report
- Prescription
- Discharge Summary
- Other

### Setup Process

#### 1. Google Cloud Console Setup
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable **Google Drive API**:
   - Navigate to APIs & Services → Library
   - Search "Google Drive API" → Enable

#### 2. OAuth 2.0 Credentials
1. Go to APIs & Services → Credentials
2. Create OAuth 2.0 Client ID:
   - Application type: Web application
   - Authorized redirect URI: `https://YOUR_PROJECT_ID.supabase.co/functions/v1/google-drive-callback`
3. Copy Client ID and Client Secret

#### 3. Supabase Configuration
Set the following secrets in Supabase:
```bash
supabase secrets set GOOGLE_CLIENT_ID=your_client_id_here
supabase secrets set GOOGLE_CLIENT_SECRET=your_client_secret_here
```

#### 4. Connect in Application
1. Login as super admin
2. Navigate to Settings → Google Drive Integration
3. Click "Connect Google Drive"
4. Authorize the application
5. Documents will now auto-upload to Drive

### Edge Functions
- `upload-to-drive`: Handles file uploads and deletions
- `google-drive-auth`: Initiates OAuth flow
- `google-drive-callback`: Processes OAuth callback
- `google-drive-status`: Checks connection status
- `invite-admin`: Sends admin invitations
- `list-admins`: Lists all admin users

## 💳 Payment & Receipt System

### Features
- Multiple payment methods (Cash, UPI, Bank Transfer, Cheque)
- Automatic receipt number generation
- Extra charges integration
- Multi-month payment support
- Professional PDF receipts with:
  - Branded header with organization name
  - Itemized charge breakdown
  - Payment status indicator
  - Responsive layout for printing

### Receipt Actions
- **Download**: Save as PDF
- **Print**: Direct browser print
- **Share on WhatsApp**: Share receipt file or text

## 🗃️ Database Schema

### Main Tables
- `residents`: Personal info, medical details, status
- `rooms`: Room details, pricing, capacity
- `room_assignments`: Resident-room mappings
- `payments`: Payment records with receipts
- `documents`: Document metadata and Drive links
- `reminders`: Alerts and notifications
- `food_menu`: Weekly meal schedules
- `user_roles`: Admin role assignments
- `google_drive_config`: OAuth tokens
- `resident_extra_charges`: Additional billing items

## 🛠️ Local Development

### Prerequisites
- Node.js 18+ and npm
- Supabase account
- Google Cloud project (for Drive integration)

### Installation

```bash
# Clone repository
git clone <repository-url>
cd haven-manager

# Install dependencies
npm install

# Set up environment variables
# Create .env file with:
# VITE_SUPABASE_URL=your_supabase_url
# VITE_SUPABASE_ANON_KEY=your_anon_key

# Start development server
npm run dev
```

### Supabase Setup

1. Create new Supabase project
2. Run migrations from `supabase/migrations/` folder
3. Deploy edge functions:
```bash
supabase functions deploy upload-to-drive
supabase functions deploy google-drive-auth
supabase functions deploy google-drive-callback
supabase functions deploy google-drive-status
supabase functions deploy invite-admin
supabase functions deploy list-admins
```

4. Set required secrets:
```bash
supabase secrets set GOOGLE_CLIENT_ID=xxx
supabase secrets set GOOGLE_CLIENT_SECRET=xxx
```

## 📦 Project Structure

```
haven-manager/
├── src/
│   ├── components/        # Reusable UI components
│   │   ├── layout/       # AppLayout, AppSidebar
│   │   └── ui/           # shadcn components
│   ├── contexts/         # React Context (Auth)
│   ├── hooks/            # Custom React hooks
│   ├── lib/              # Utilities (PDF, Supabase client)
│   ├── pages/            # Route pages
│   └── integrations/     # API integrations
├── supabase/
│   ├── functions/        # Edge functions
│   └── migrations/       # Database migrations
└── public/              # Static assets
```

## 🚀 Deployment

### Via Lovable
1. Open project in Lovable
2. Click Share → Publish
3. Your app is live!

### Manual Deployment
1. Build the project: `npm run build`
2. Deploy `dist/` folder to your hosting provider
3. Ensure environment variables are set
4. Deploy Supabase functions separately

## 🌐 Custom Domain

Connect a custom domain via:
- Project → Settings → Domains → Connect Domain
- Follow DNS configuration instructions
- SSL certificate auto-provisioned

## 🔧 Configuration

### Environment Variables
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### Supabase Secrets (for Edge Functions)
```bash
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret
SUPABASE_URL=auto-provided
SUPABASE_SERVICE_ROLE_KEY=auto-provided
SUPABASE_ANON_KEY=auto-provided
```

## 📝 Key Features in Detail

### Admin Invitation System
- Super admin invites admins via email from Settings page
- Invited user receives email with secure setup link
- User clicks link → Sets name and password → Gains access
- Admin role automatically assigned upon setup
- Full application access (except Drive connection and admin management)

### Payment Receipts
- Automatically generated with unique receipt numbers
- Format: `RCP` + Year (2 digits) + Month (2 digits) + Random (4 digits)
- Example: `RCP25125609`
- Includes base charges + extra charges breakdown
- Professional PDF layout with organization branding
- Rupee symbol properly displayed as "Rs. " for PDF compatibility

### Extra Charges Management
- Categories: Medicine, Doctor Visit, Other
- Track unbilled charges per resident
- Automatically included in next payment
- Itemized in receipt with dates
- Mark as billed after payment

### Mobile Navigation
- Fixed header bar on mobile with hamburger menu
- Slide-in sidebar navigation
- Touch-optimized menu items
- Auto-closes on page navigation
- Desktop: Always-visible sidebar with collapse option

## 🤝 Contributing

1. Fork the repository
2. Create feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open Pull Request

## 📄 License

This project is proprietary software for care home management.

## 🆘 Support

For issues or questions:
- Check existing GitHub issues
- Create new issue with detailed description
- Contact support team

## 🎯 Roadmap

- [ ] SMS notifications for reminders
- [ ] Visitor management system
- [ ] Medical appointment scheduling
- [ ] Inventory management for supplies
- [ ] Staff management module
- [ ] Analytics and reporting dashboard
- [ ] Export data to Excel/CSV
- [ ] Multi-language support

---

Built with ❤️ for better care home management
