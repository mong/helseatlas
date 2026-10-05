export const useAzureStorage =
  process.env.PAYLOAD_GENERATE_TYPES === "true" ||
  process.env.NODE_ENV !== "development" ||
  process.env.USE_AZURE_STORAGE === "true";
