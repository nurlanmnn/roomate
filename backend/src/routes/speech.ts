import express from 'express';
import { config } from '../config/env';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { TranscribeClient, StartTranscriptionJobCommand, GetTranscriptionJobCommand } from '@aws-sdk/client-transcribe';
import { STSClient, GetCallerIdentityCommand } from '@aws-sdk/client-sts';
import { fromEnv } from '@aws-sdk/credential-providers';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

const awsCredsConfigured =
  !!config.awsAccessKeyId && !!config.awsSecretAccessKey;

const s3 =
  config.awsS3Bucket && awsCredsConfigured
    ? new S3Client({
        region: config.awsS3Region,
        credentials: fromEnv(),
      })
    : null;

const transcribe =
  config.awsS3Bucket && awsCredsConfigured
    ? new TranscribeClient({
        region: config.awsRegion,
        credentials: fromEnv(),
      })
    : null;

const sts =
  awsCredsConfigured
    ? new STSClient({
        region: config.awsRegion,
        credentials: fromEnv(),
      })
    : null;

let loggedCallerIdentity = false;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

router.post('/transcribe', async (req, res) => {
  try {
    if (!config.awsS3Bucket) {
      return res.status(503).json({ error: 'AWS_S3_BUCKET is not configured' });
    }
    if (!s3 || !transcribe) {
      return res.status(503).json({
        error:
          'Speech recognition service not configured. Set AWS_REGION, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_S3_BUCKET',
      });
    }

    // Log AWS account for debugging (one-time)
    if (!loggedCallerIdentity && sts) {
      loggedCallerIdentity = true;
      try {
        const ident = await sts.send(new GetCallerIdentityCommand({}));
        console.log('AWS caller identity:', {
          account: ident.Account,
          arn: ident.Arn,
          userId: ident.UserId,
          transcribeRegion: config.awsRegion,
          s3Region: config.awsS3Region,
          bucket: config.awsS3Bucket,
        });
      } catch (e) {
        console.warn('Failed to fetch AWS caller identity (STS):', e);
      }
    }

    const { audioData, mediaFormat } = req.body as {
      audioData?: string;
      mediaFormat?: string; // e.g. "mp4" or "wav"
    }; // Base64 encoded audio

    if (!audioData) {
      return res.status(400).json({ error: 'Audio data is required' });
    }

    // Decode base64 audio
    const audioBytes = Buffer.from(audioData, 'base64');

    // Expo's HIGH_QUALITY preset typically produces m4a in an mp4 container.
    // AWS Transcribe supports "mp4" and "wav". We'll default to "mp4".
    const normalizedFormat = (mediaFormat || 'mp4').toLowerCase();
    const allowedFormats = new Set(['mp4', 'wav', 'mp3', 'flac']);
    const finalFormat = allowedFormats.has(normalizedFormat) ? normalizedFormat : 'mp4';

    const objectKey = `speech/${uuidv4()}.${finalFormat}`;
    await s3.send(
      new PutObjectCommand({
        Bucket: config.awsS3Bucket,
        Key: objectKey,
        Body: audioBytes,
        ContentType:
          finalFormat === 'wav'
            ? 'audio/wav'
            : finalFormat === 'mp3'
              ? 'audio/mpeg'
              : 'audio/mp4',
      })
    );

    const jobName = `roomate-${uuidv4()}`;
    const mediaUri = `s3://${config.awsS3Bucket}/${objectKey}`;

    await transcribe.send(
      new StartTranscriptionJobCommand({
        TranscriptionJobName: jobName,
        LanguageCode: config.awsTranscribeLanguageCode as any,
        MediaFormat: finalFormat as any,
        Media: { MediaFileUri: mediaUri },
        Settings: {
          ShowSpeakerLabels: false,
          ShowAlternatives: false,
        },
      })
    );

    // Poll until completion (short timeout to keep mobile UX snappy)
    const timeoutMs = 60_000;
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      const jobResp = await transcribe.send(
        new GetTranscriptionJobCommand({ TranscriptionJobName: jobName })
      );

      const job = jobResp.TranscriptionJob;
      const status = job?.TranscriptionJobStatus;

      if (status === 'FAILED') {
        return res.status(500).json({
          error: job?.FailureReason || 'Transcription job failed',
        });
      }

      if (status === 'COMPLETED') {
        const uri = job?.Transcript?.TranscriptFileUri;
        if (!uri) {
          return res.status(500).json({ error: 'Transcript file URI missing' });
        }

        const transcriptResp = await fetch(uri);
        if (!transcriptResp.ok) {
          return res.status(500).json({ error: 'Failed to fetch transcript file' });
        }
        const json = (await transcriptResp.json()) as any;
        const transcript =
          json?.results?.transcripts?.[0]?.transcript || '';
        return res.json({ transcript });
      }

      await sleep(2000);
    }

    return res.status(504).json({
      error: 'Transcription timed out. Please try again.',
    });
  } catch (error: any) {
    console.error('Speech recognition error:', error);
    const message = error?.message || '';
    const type = error?.__type || error?.name || '';

    // Common AWS account-level issue (often happens on new/locked-down accounts)
    if (type === 'SubscriptionRequiredException' || message.includes('SubscriptionRequiredException')) {
      return res.status(403).json({
        error:
          'AWS Transcribe is not available for this account/credentials (SubscriptionRequiredException). ' +
          'Make sure you are using a normal AWS account with billing/payment method set up, and that Amazon Transcribe is available in your selected AWS_REGION.',
      });
    }

    res.status(500).json({ error: message || 'Failed to transcribe audio' });
  }
});

export default router;

