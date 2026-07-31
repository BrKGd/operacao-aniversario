import { modalAlerta } from './modalAlertas';

interface CompressOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
}

/**
 * Comprime e redimensiona um arquivo de imagem enviado via input/câmera
 * Retorna uma string Data URL (Base64 JPEG) otimizada e leve (~30KB a 60KB).
 */
export async function compressImageFile(
  file: File, 
  options: CompressOptions = {}
): Promise<string> {
  const { maxWidth = 600, maxHeight = 600, quality = 0.8 } = options;

  if (!file || !file.type.startsWith('image/')) {
    modalAlerta.show({
      title: "Arquivo Inválido",
      message: "Por favor, selecione um arquivo de imagem válido (JPG, PNG, WEBP).",
      type: "warning"
    });
    throw new Error("Arquivo não é uma imagem válida.");
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onerror = () => {
      modalAlerta.show({
        title: "Erro ao Ler Imagem",
        message: "Não foi possível carregar a imagem selecionada.",
        type: "error"
      });
      reject(new Error("Falha na leitura do arquivo de imagem."));
    };

    reader.onload = (e) => {
      const img = new Image();
      img.onerror = () => {
        modalAlerta.show({
          title: "Erro no Formato",
          message: "O formato da imagem selecionada não é suportado pelo navegador.",
          type: "error"
        });
        reject(new Error("Formato de imagem incompatível."));
      };

      img.onload = () => {
        try {
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > maxWidth) {
              height = Math.round((height * maxWidth) / width);
              width = maxWidth;
            }
          } else {
            if (height > maxHeight) {
              width = Math.round((width * maxHeight) / height);
              height = maxHeight;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          if (!ctx) {
            throw new Error("Não foi possível inicializar o contexto 2D do Canvas.");
          }

          // Preenche fundo branco caso seja imagem PNG transparente convertida para JPEG
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, width, height);

          ctx.drawImage(img, 0, 0, width, height);

          const compressedBase64 = canvas.toDataURL('image/jpeg', quality);
          resolve(compressedBase64);
        } catch (err: any) {
          modalAlerta.show({
            title: "Erro ao Processar Imagem",
            message: err.message || "Falha ao comprimir a imagem selecionada.",
            type: "error"
          });
          reject(err);
        }
      };

      img.src = e.target?.result as string;
    };

    reader.readAsDataURL(file);
  });
}
