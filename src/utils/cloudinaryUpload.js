/**
 * Cloudinary Universal Upload Utility
 * Handles uploading Files, Blobs, base64 strings, and PDFs/Images/Documents to Cloudinary.
 * PDF/documents are uploaded as 'raw' to avoid Cloudinary's default 401 ACL restriction on image/upload PDFs.
 * Always returns the secure Cloudinary URL.
 */
export const uploadToCloudinary = async (fileOrBase64, customFileName = "") => {
  if (!fileOrBase64) return "";

  // If it is already a hosted URL, return it directly
  if (
    typeof fileOrBase64 === "string" &&
    (fileOrBase64.startsWith("http://") || fileOrBase64.startsWith("https://"))
  ) {
    return fileOrBase64;
  }

  const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || "ukcniyyc";
  const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || "Hrfmsnew";

  // Detect if file is PDF, document, or non-image binary
  const isPdfOrDocument = () => {
    if (customFileName) {
      const fn = customFileName.toLowerCase();
      if (
        fn.endsWith(".pdf") ||
        fn.endsWith(".doc") ||
        fn.endsWith(".docx") ||
        fn.endsWith(".xls") ||
        fn.endsWith(".xlsx") ||
        fn.endsWith(".txt") ||
        fn.endsWith(".csv") ||
        fn.endsWith(".zip")
      ) {
        return true;
      }
    }
    if (typeof fileOrBase64 === "object" && fileOrBase64) {
      if (fileOrBase64.name) {
        const fn = fileOrBase64.name.toLowerCase();
        if (
          fn.endsWith(".pdf") ||
          fn.endsWith(".doc") ||
          fn.endsWith(".docx") ||
          fn.endsWith(".xls") ||
          fn.endsWith(".xlsx") ||
          fn.endsWith(".txt") ||
          fn.endsWith(".csv") ||
          fn.endsWith(".zip")
        ) {
          return true;
        }
      }
      if (fileOrBase64.type) {
        const type = fileOrBase64.type.toLowerCase();
        if (
          type.includes("pdf") ||
          type.includes("document") ||
          type.includes("sheet") ||
          type.includes("msword") ||
          type.includes("text/plain") ||
          type.includes("zip")
        ) {
          return true;
        }
      }
    }
    if (typeof fileOrBase64 === "string") {
      const lower = fileOrBase64.toLowerCase();
      if (
        lower.startsWith("data:application/pdf") ||
        lower.startsWith("data:application/msword") ||
        lower.startsWith("data:application/vnd") ||
        lower.startsWith("data:application/zip") ||
        lower.startsWith("data:text/")
      ) {
        return true;
      }
    }
    return false;
  };

  const isRaw = isPdfOrDocument();
  const endpointType = isRaw ? "raw" : "auto";

  let uploadPayload = fileOrBase64;
  if (typeof fileOrBase64 === "string" && !fileOrBase64.startsWith("data:")) {
    uploadPayload = `data:application/octet-stream;base64,${fileOrBase64}`;
  }

  const formData = new FormData();
  formData.append("file", uploadPayload);
  formData.append("upload_preset", uploadPreset);

  if (isRaw) {
    const rawName =
      customFileName ||
      (typeof fileOrBase64 === "object" && fileOrBase64?.name) ||
      "document.pdf";
    const cleanName = rawName.replace(/[^a-zA-Z0-9._-]/g, "_");
    formData.append("public_id", `${Date.now()}_${cleanName}`);
  }

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${cloudName}/${endpointType}/upload`,
    {
      method: "POST",
      body: formData,
    }
  );

  const data = await response.json();
  if (!response.ok || data.error) {
    console.error("Cloudinary upload failed:", data);
    // If raw upload fails with preset, fallback to auto
    if (endpointType === "raw") {
      const fallbackFormData = new FormData();
      fallbackFormData.append("file", uploadPayload);
      fallbackFormData.append("upload_preset", uploadPreset);
      const fallbackRes = await fetch(
        `https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`,
        {
          method: "POST",
          body: fallbackFormData,
        }
      );
      const fallbackData = await fallbackRes.json();
      if (fallbackRes.ok && !fallbackData.error) {
        return fallbackData.secure_url || fallbackData.url || "";
      }
    }
    throw new Error(data.error?.message || "Failed to upload file to Cloudinary");
  }

  return data.secure_url || data.url || "";
};

export default uploadToCloudinary;
