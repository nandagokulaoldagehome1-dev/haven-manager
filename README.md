# Nanda Gokula Old Age Home Management System

A comprehensive management system for old age homes built with React, TypeScript, and Supabase.

## Features

- **Resident Management**: Track resident information, medical details, and emergency contacts
- **Room Management**: Manage room assignments and availability
- **Payment Tracking**: Record and manage resident payments
- **Document Management**: Store and organize resident documents in Google Drive
- **Food Menu**: Weekly meal planning and management
- **Reminders**: Set and track important reminders
- **User Roles**: Super admin and admin role-based access control

## Technology Stack

- **Frontend**: React, TypeScript, Vite, Tailwind CSS, shadcn-ui
- **Backend**: Supabase (PostgreSQL, Auth, Edge Functions, Storage)
- **File Storage**: Google Drive integration for documents

## Google Drive Integration

Documents are stored in Google Drive with automatic resident-wise folder organization.

### Setup Requirements

1. **Google Cloud Project**: Create a project in [Google Cloud Console](https://console.cloud.google.com/)

2. **Service Account**: Create a service account with Google Drive API access
   - Go to IAM & Admin → Service Accounts
   - Create a new service account
   - Download the JSON key file

3. **Enable Google Drive API**: 
   - Go to APIs & Services → Enable APIs
   - Search for "Google Drive API" and enable it

4. **Create Root Folder**:
   - Create a folder in Google Drive named "Residents-Documents" (or any name)
   - Share this folder with the service account email (found in the JSON key as `client_email`)
   - Grant "Editor" access
   - Copy the folder ID from the URL: `https://drive.google.com/drive/folders/<FOLDER_ID>`

5. **Configure Secrets** (in Supabase Edge Function Secrets):
   - `GOOGLE_SERVICE_ACCOUNT_JSON`: The full JSON content of your service account key
   - `GOOGLE_DRIVE_FOLDER_ID`: The folder ID where documents will be stored

### How It Works

- Documents are uploaded via the `upload-to-drive` edge function
- Each resident gets their own subfolder automatically created
- Files are made publicly viewable for easy access
- File references (Google Drive file ID and view URL) are stored in the database

### Folder Structure

```
Residents-Documents/
├── Resident Name 1/
│   ├── aadhaar_1234567890.pdf
│   ├── medical_report_1234567891.pdf
│   └── ...
├── Resident Name 2/
│   ├── pan_1234567892.pdf
│   └── ...
└── ...
```

## Google OAuth Integration (Admin Settings)

For admin users to connect their personal Google Drive (optional):

1. Create OAuth 2.0 credentials in Google Cloud Console
2. Add the callback URL: `https://<project-id>.supabase.co/functions/v1/google-drive-callback`
3. Configure secrets:
   - `GOOGLE_CLIENT_ID`
   - `GOOGLE_CLIENT_SECRET`

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

## Deployment

Open [Lovable](https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID) and click Share → Publish.

## Custom Domain

To connect a custom domain, navigate to Project → Settings → Domains and click Connect Domain.

Read more: [Setting up a custom domain](https://docs.lovable.dev/features/custom-domain#custom-domain)
