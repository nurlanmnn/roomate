import { apiClient } from './apiClient';

export const speechApi = {
  /**
   * Transcribe audio to text using the backend speech endpoint (AWS Transcribe)
   * @param audioUri - URI of the recorded audio file
   * @returns Transcript of the audio
   */
  transcribe: async (audioUri: string): Promise<{ transcript: string }> => {
    try {
      // Read audio file and convert to base64
      const response = await fetch(audioUri);
      const blob = await response.blob();
      
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        
        reader.onloadend = async () => {
          try {
            // Extract base64 data (remove data:audio/wav;base64, prefix)
            const base64data = (reader.result as string).split(',')[1];
            
            if (!base64data) {
              reject(new Error('Failed to convert audio to base64'));
              return;
            }
            
            const result = await apiClient.instance.post('/speech/transcribe', {
              audioData: base64data,
              // Expo recordings are typically m4a in an mp4 container
              mediaFormat: 'mp4',
            });
            
            resolve(result.data);
          } catch (error) {
            reject(error);
          }
        };
        
        reader.onerror = (error) => {
          reject(new Error('Failed to read audio file'));
        };
        
        reader.readAsDataURL(blob);
      });
    } catch (error) {
      throw new Error(`Failed to transcribe audio: ${error}`);
    }
  },
};

