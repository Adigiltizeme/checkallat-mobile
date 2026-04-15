import { API_CONFIG } from '../config/api';

/**
 * Upload une image vers Cloudinary via l'API backend
 * @param imageUri - URI locale de l'image (file://...)
 * @param token - Token JWT de l'utilisateur
 * @returns URL Cloudinary de l'image uploadée
 */
export const uploadImageToCloudinary = async (
  imageUri: string,
  token: string
): Promise<string> => {
  try {
    // Créer FormData
    const formData = new FormData();

    // Extraire le nom du fichier et le type MIME
    const filename = imageUri.split('/').pop() || 'photo.jpg';
    const match = /\.(\w+)$/.exec(filename);
    const type = match ? `image/${match[1]}` : 'image/jpeg';

    // Ajouter le fichier au FormData
    formData.append('file', {
      uri: imageUri,
      name: filename,
      type: type,
    } as any);

    // Faire la requête
    const response = await fetch(`${API_CONFIG.BASE_URL}/upload/image`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'ngrok-skip-browser-warning': 'true',
      },
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `Erreur HTTP: ${response.status}`);
    }

    const data = await response.json();
    return data.url; // URL Cloudinary
  } catch (error: any) {
    console.error('Erreur upload image:', error);
    throw new Error(`Impossible d'uploader l'image: ${error.message}`);
  }
};

/**
 * Upload plusieurs images vers Cloudinary
 * @param imageUris - Array d'URIs locales
 * @param token - Token JWT de l'utilisateur
 * @param onProgress - Callback optionnel pour suivre la progression (index, total)
 * @returns Array d'URLs Cloudinary
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
      // Continuer même si une image échoue
      // Vous pouvez choisir de throw l'erreur si vous voulez arrêter tout
    }
  }

  return uploadedUrls;
};
