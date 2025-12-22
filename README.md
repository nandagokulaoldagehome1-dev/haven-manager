# Nanda Gokula Old Age Home Management System

A comprehensive management system for old age homes built with React, TypeScript, and Supabase.

## Features

- **Resident Management**: Track resident information, medical details, and emergency contacts
- **Room Management**: Manage room assignments and availability
- **Payment Tracking**: Record and manage resident payments
- **Document Management**: Store and organize resident documents in Google Drive (resident-wise folders)
- **Food Menu**: Weekly meal planning and management
- **Reminders**: Set and track important reminders
- **User Roles**: Super admin and admin role-based access control

## Technology Stack

- **Frontend**: React, TypeScript, Vite, Tailwind CSS, shadcn-ui
- **Backend**: Supabase (PostgreSQL, Auth, Edge Functions)
- **File Storage**: Google Drive (via OAuth integration)

## Google Drive Integration

Documents are automatically uploaded to the connected admin's Google Drive with resident-wise folder organization.

### How It Works

1. **Admin connects Google Drive** in Settings page (OAuth flow)
2. **Auto-folder creation**: A "Residents-Documents" folder is automatically created in the admin's Drive
3. **Resident subfolders**: Each resident gets their own subfolder
4. **Multiple documents per category**: You can upload multiple prescriptions, medical reports, etc. for the same resident (each file has unique timestamp)
5. **Public viewing**: Files are made publicly viewable via link for easy access

### Folder Structure in Google Drive

```
My Drive/
└── Residents-Documents/
    ├── Resident Name 1/
    │   ├── aadhaar_1734567890123.pdf
    │   ├── prescription_1734567891234.pdf
    │   ├── prescription_1734568901234.pdf  (multiple allowed)
    │   ├── medical_report_1734567892345.pdf
    │   └── ...
    ├── Resident Name 2/
    │   ├── pan_1734567893456.pdf
    │   ├── discharge_summary_1734567894567.pdf
    │   └── ...
    └── ...
```

### Document Categories

- **Aadhaar Card** - Government ID
- **PAN Card** - Tax ID
- **Medical Report** - Lab reports, diagnostics
- **Prescription** - Doctor prescriptions (multiple allowed per resident)
- **Discharge Summary** - Hospital discharge papers
- **Other** - Any other documents

### Setup Requirements

1. **Google Cloud Project**: Create a project in [Google Cloud Console](https://console.cloud.google.com/)

2. **Enable Google Drive API**: 
   - Go to APIs & Services → Enable APIs
   - Search for "Google Drive API" and enable it

3. **Create OAuth 2.0 Credentials**:
   - Go to APIs & Services → Credentials
   - Create OAuth 2.0 Client ID (Web application)
   - Add authorized redirect URI: `https://geimemclslezirwtuvkh.supabase.co/functions/v1/google-drive-callback`

4. **Configure Supabase Secrets**:
   - `GOOGLE_CLIENT_ID`: Your OAuth client ID
   - `GOOGLE_CLIENT_SECRET`: Your OAuth client secret

5. **Connect in App**:
   - Login as super admin
   - Go to Settings → Google Drive Integration
   - Click "Connect Google Drive" and authorize

### Edge Functions

- `upload-to-drive`: Handles file uploads and deletions
- `google-drive-auth`: Initiates OAuth flow
- `google-drive-callback`: Handles OAuth callback and stores tokens
- `google-drive-status`: Checks connection status

## Local Development

```sh
# Clone the repository
git clone <YOUR_GIT_URL>

# Navigate to project directory
cd <YOUR_PROJECT_NAME>

# Install dependencies
npm install

# Start development server
npm run dev
```

## Database Tables

- `residents`: Resident personal and medical information
- `rooms`: Room details and pricing
- `room_assignments`: Room-resident mappings
- `payments`: Payment records
- `documents`: Document metadata (links to Google Drive files)
- `reminders`: Task reminders
- `food_menu`: Weekly meal plans
- `user_roles`: Admin role assignments
- `google_drive_config`: OAuth tokens and folder configuration

## Deployment

Open [Lovable](https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID) and click Share → Publish.

## Custom Domain

To connect a custom domain, navigate to Project → Settings → Domains and click Connect Domain.

Read more: [Setting up a custom domain](https://docs.lovable.dev/features/custom-domain#custom-domain)
