/**
 * Tiện ích kiểm tra tính hợp lệ và khử trùng (sanitization) file ảnh tải lên
 * Bảo vệ hệ thống khỏi việc tải lên file giả mạo (.exe, script, html, malware)
 */

/**
 * Kiểm tra Magic Bytes (chữ ký nhị phân) ở đầu file
 * Ngăn chặn tuyệt đối việc đổi đuôi file bậy bạ thành .jpg / .png
 */
export async function verifyImageMagicBytes(
  file: File | Blob
): Promise<{ isValid: boolean; mimeType?: string }> {
  try {
    const buffer = await file.slice(0, 12).arrayBuffer();
    const bytes = new Uint8Array(buffer);

    // 1. JPEG: FF D8 FF
    if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
      return { isValid: true, mimeType: 'image/jpeg' };
    }

    // 2. PNG: 89 50 4E 47 0D 0A 1A 0A
    if (
      bytes[0] === 0x89 &&
      bytes[1] === 0x50 &&
      bytes[2] === 0x4e &&
      bytes[3] === 0x47 &&
      bytes[4] === 0x0d &&
      bytes[5] === 0x0a &&
      bytes[6] === 0x1a &&
      bytes[7] === 0x0a
    ) {
      return { isValid: true, mimeType: 'image/png' };
    }

    // 3. WEBP: 52 49 46 46 (RIFF) ... 57 45 42 50 (WEBP)
    if (
      bytes[0] === 0x52 &&
      bytes[1] === 0x49 &&
      bytes[2] === 0x46 &&
      bytes[3] === 0x46 &&
      bytes[8] === 0x57 &&
      bytes[9] === 0x45 &&
      bytes[10] === 0x42 &&
      bytes[11] === 0x50
    ) {
      return { isValid: true, mimeType: 'image/webp' };
    }

    return { isValid: false };
  } catch {
    return { isValid: false };
  }
}

export interface ImageValidationResult {
  success: boolean;
  blob?: Blob;
  error?: string;
}

/**
 * Xác thực đa tầng & Khử khuẩn (Sanitization) file ảnh:
 * - Kiểm tra dung lượng (tối đa 5MB)
 * - Kiểm tra định dạng cho phép (JPG, PNG, WEBP)
 * - Kiểm tra Magic Bytes nhị phân
 * - Giải mã bằng Image Decoder trình duyệt
 * - Vẽ lại qua Canvas để loại bỏ 100% metadata lạ, mã độc hay script nhúng ngầm
 * - Nén về WebP chuẩn nét, nhẹ (~20KB - 40KB)
 */
export async function sanitizeAndValidateImage(
  file: File,
  maxWidth = 600,
  quality = 0.85
): Promise<ImageValidationResult> {
  // 1. Kiểm tra dung lượng file (tối đa 5MB)
  const MAX_SIZE = 5 * 1024 * 1024;
  if (file.size > MAX_SIZE) {
    return {
      success: false,
      error: 'Dung lượng file vượt quá 5MB. Vui lòng chọn ảnh nhẹ hơn.',
    };
  }
  if (file.size < 64) {
    return {
      success: false,
      error: 'File không có nội dung hoặc bị lỗi.',
    };
  }

  // 2. Kiểm tra định dạng khai báo (Chặn file thực thi, script, svg nhúng xss...)
  const declaredMime = file.type.toLowerCase();
  const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
  if (!ALLOWED_MIME.includes(declaredMime)) {
    return {
      success: false,
      error: 'Định dạng file không hợp lệ. Chỉ chấp nhận ảnh JPG, PNG hoặc WEBP.',
    };
  }

  // 3. Kiểm tra chữ ký Magic Bytes thực tế bên trong file
  const magicCheck = await verifyImageMagicBytes(file);
  if (!magicCheck.isValid) {
    return {
      success: false,
      error: 'Tệp tin không phải là ảnh thật (chữ ký nhị phân không hợp lệ). Vui lòng không đổi đuôi file bậy bạ.',
    };
  }

  // 4. Giải mã bằng HTML Image Decoder và vẽ lại qua Canvas
  return new Promise((resolve) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);

      // Kích thước tối thiểu cho mã QR có thể quét được
      if (img.width < 50 || img.height < 50) {
        resolve({
          success: false,
          error: 'Kích thước ảnh quá nhỏ, không thể quét được mã QR.',
        });
        return;
      }

      // Giới hạn độ phân giải hợp lý
      if (img.width > 8000 || img.height > 8000) {
        resolve({
          success: false,
          error: 'Độ phân giải ảnh quá lớn (vượt quá 8000px).',
        });
        return;
      }

      let width = img.width;
      let height = img.height;

      if (width > maxWidth) {
        height = Math.round((height * maxWidth) / width);
        width = maxWidth;
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        resolve({
          success: false,
          error: 'Không thể xử lý ảnh trên trình duyệt này.',
        });
        return;
      }

      // Tô nền trắng để chống lỗi khi quét ảnh PNG trong suốt
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, width, height);

      // Vẽ ảnh lên canvas (chỉ lấy pixel sạch, loại bỏ mọi metadata/script lạ)
      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            resolve({
              success: false,
              error: 'Không thể tạo ảnh đã khử trùng.',
            });
            return;
          }
          resolve({ success: true, blob });
        },
        'image/webp',
        quality
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve({
        success: false,
        error: 'Trình duyệt không thể giải mã hình ảnh này. File bị lỗi hoặc không phải hình ảnh.',
      });
    };

    img.src = objectUrl;
  });
}
