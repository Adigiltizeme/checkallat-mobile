import { API_CONFIG } from '../config/api';

/**
 * Upload une image vers Cloudinary via l'API backend.
 * Utilise XMLHttpRequest au lieu de fetch pour l'upload multipart/form-data,
 * car fetch avec la nouvelle architecture RN 0.76+ ne supporte pas l'objet
 * {uri, name, type} dans FormData (Unsupported FormDataPart implementation).
 */
export const uploadImageToCloudinary = async (
  imageUri: string,
  token: string
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const filename = imageUri.split('/').pop() || 'photo.jpg';
    const match = /\.(\w+)$/.exec(filename);
    const type = match ? `image/${match[1].toLowerCase()}` : 'image/jpeg';

    const formData = new FormData();
    // XHR supporte l'objet file natif React Native sur toutes les architectures
    formData.append('file', { uri: imageUri, name: filename, type } as any);

    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${API_CONFIG.BASE_URL}/upload/image`);
    xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    xhr.timeout = 30000;

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const data = JSON.parse(xhr.responseText);
          resolve(data.url);
        } catch {
          reject(new Error('Réponse invalide du serveur'));
        }
      } else {
        try {
          const err = JSON.parse(xhr.responseText);
          reject(new Error(err.message || `Erreur HTTP: ${xhr.status}`));
        } catch {
          reject(new Error(`Erreur HTTP: ${xhr.status}`));
        }
      }
    };

    xhr.onerror = () => reject(new Error("Erreur réseau lors de l'upload"));
    xhr.ontimeout = () => reject(new Error("Délai d'attente dépassé lors de l'upload"));

    xhr.send(formData);
  });
};

/**
 * Upload plusieurs images vers Cloudinary
 */
export const uploadMultipleImages = async (
  imageUris: string[],
  token: string,
  onProgress?: (current: number, total: number) => void
): Promise<string[]> => {
  const uploadedUrls: string[] = [];

  for (let i = 0; i < imageUris.length; i++) {
    try {
      if (onProgress) {
        onProgress(i + 1, imageUris.length);
      }
      const url = await uploadImageToCloudinary(imageUris[i], token);
      uploadedUrls.push(url);
    } catch (error) {
      console.error(`Erreur upload image ${i + 1}:`, error);
    }
  }

  return uploadedUrls;
};
