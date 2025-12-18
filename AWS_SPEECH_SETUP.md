# AWS Speech Recognition (Amazon Transcribe) Setup

This project implements speech recognition via **Amazon Transcribe** behind the backend endpoint `POST /speech/transcribe`.

High-level flow:
- Mobile records audio (`expo-av`)
- Mobile uploads audio as **base64** to backend
- Backend uploads audio to **S3**
- Backend starts an **Amazon Transcribe** job
- Backend polls until complete and returns `{ transcript }`

## 1) Create AWS resources

### A. Create an S3 bucket
- **Where**: AWS Console → **S3** → **Buckets** → **Create bucket**
- **Bucket name**: pick a globally-unique name (example: `roomate-speech-audio-<yourname>`)
- **Region**: choose any region you want for S3 (example: `us-east-2`)
- **Object Ownership**: keep default (**ACLs disabled**)
- **Block Public Access**: keep **all ON** (private bucket)
- **Versioning**: optional (OFF is fine for this use-case)

Optional but recommended:
- **Lifecycle rule** (to avoid storage buildup): S3 → your bucket → **Management** → **Lifecycle rules** → **Create**
  - Scope: prefix `speech/`
  - Expire current versions after: e.g. **7 days**

### B. Create an IAM user (or IAM role)
Recommended for local development: **IAM user** with access keys.

Steps:
- AWS Console → **IAM** → **Policies** → **Create policy**
- Choose **JSON** and paste the policy below
- Replace `YOUR_BUCKET_NAME` with your bucket name
- Save policy (example name: `RoomateSpeechTranscribePolicy`)

Policy (least-privilege for this project):

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "S3PutAudio",
      "Effect": "Allow",
      "Action": ["s3:PutObject"],
      "Resource": ["arn:aws:s3:::YOUR_BUCKET_NAME/speech/*"]
    },
    {
      "Sid": "TranscribeJobs",
      "Effect": "Allow",
      "Action": [
        "transcribe:StartTranscriptionJob",
        "transcribe:GetTranscriptionJob"
      ],
      "Resource": "*"
    }
  ]
}
```

Create the IAM user and keys:
- IAM → **Users** → **Create user**
  - User name: e.g. `roomate-local-dev`
  - Permissions: **Attach policies directly** → select `RoomateSpeechTranscribePolicy`
- After creating user: open the user → **Security credentials**
  - **Create access key** → use case: “Application running outside AWS”
  - Save:
    - `AWS_ACCESS_KEY_ID`
    - `AWS_SECRET_ACCESS_KEY`

Security note:
- Put these keys only in `backend/.env` (don’t commit them).
- If you deploy backend on AWS later, switch to an **IAM role** and remove access keys entirely.

## 2) Configure backend environment variables

In `backend/.env` add:

```bash
# Region used by Amazon Transcribe (recommend: us-east-1 for reliability)
AWS_REGION=us-east-1
# Region where your S3 bucket actually lives (must match your bucket)
AWS_S3_REGION=us-east-2
AWS_ACCESS_KEY_ID=xxxxx
AWS_SECRET_ACCESS_KEY=xxxxx
AWS_S3_BUCKET=roomate-speech-audio
AWS_TRANSCRIBE_LANGUAGE_CODE=en-US
```

Notes:
- `AWS_TRANSCRIBE_LANGUAGE_CODE` defaults to `en-US` if omitted.
- If you run the backend on AWS (EC2/ECS/Lambda) you should use an **IAM role** instead of access keys.

## 3) Install backend deps

```bash
cd backend
npm install
```

## 4) Run backend

```bash
cd backend
npm run dev
```

## 5) Mobile side (already wired)

Mobile calls:
- `mobile/src/api/speechApi.ts` → `POST /speech/transcribe` with `{ audioData }`

## 6) Test

1. Start backend (`npm run dev`)
2. Start mobile
3. Go to Shopping → tap **Voice Input**
4. Say “milk, eggs, bread”
5. Tap again to stop
6. You should see items added after transcription

## Troubleshooting

### HTTP 413 (Payload Too Large)
This means the recorded audio (base64) is bigger than the backend JSON limit.

Fixes:
- Make recordings short (recommended: **1–5 seconds**)
- Ensure backend uses a higher JSON limit (already set in `backend/src/index.ts`):
  - `express.json({ limit: '15mb' })`

### “AWS_S3_BUCKET is not configured”
Set `AWS_S3_BUCKET` in `backend/.env`.

### “Speech recognition service not configured…”
Set `AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_S3_BUCKET`.

### S3 `PermanentRedirect`
If backend logs show `PermanentRedirect` and an endpoint like `...s3.us-east-2.amazonaws.com`, it means your S3 client is using the wrong region.

Fix:
- Set `AWS_S3_REGION` to your bucket’s region (e.g. `us-east-2`)
- Restart backend

### “Transcription timed out”
Long recordings can take longer than 60s. Keep recordings short (1–10 seconds), or increase timeout in backend `backend/src/routes/speech.ts`.

### “SubscriptionRequiredException”
If backend logs show:
- `SubscriptionRequiredException: The AWS Access Key Id needs a subscription for the service`

This is an **AWS account-level** restriction (not an IAM policy issue). Common causes:
- The AWS account doesn’t have a **payment method/billing** set up yet (even if you plan to stay in free tier).
- You’re using credentials from a restricted AWS environment (some org/sandbox accounts block services).
- Region mismatch: make sure `AWS_REGION` is a region where **Amazon Transcribe** is available (try `us-east-1`).

Fix:
- In AWS Console, ensure billing is enabled / payment method exists for the account.
- Set `AWS_REGION=us-east-1` and restart backend.

### Audio format issues
Expo’s `HIGH_QUALITY` preset typically records `.m4a` (mp4 container).
Backend defaults to `mediaFormat=mp4`.

If you change recording format to WAV later, send `mediaFormat: "wav"` from mobile.


