import type { ImageLoader } from "next/image";
import { PinataSDK } from "pinata";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore - helia http client types may not be installed yet
import { createHeliaHTTP } from "@helia/http";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore - helia unixfs types may not be installed yet
import { unixfs } from "@helia/unixfs";

// Initialize Pinata SDK
const pinata = new PinataSDK({
  pinataJwt: process.env.NEXT_PUBLIC_PINATA_JWT,
  pinataGateway: process.env.NEXT_PUBLIC_PINATA_GATEWAY, // Remove the ! here
});

// Lazy Helia HTTP + UnixFS client for reads (images, metadata, etc.)
let heliaHttp: any | null = null;
let heliaUnixFs: any | null = null;

const getUnixFs = async () => {
  if (!heliaHttp) {
    // HTTP-only Helia node that uses gateways under the hood
    heliaHttp = await createHeliaHTTP();
  }
  if (!heliaUnixFs) {
    heliaUnixFs = unixfs(heliaHttp);
  }
  return heliaUnixFs;
};

export const extractIpfsCid = (url: string): string | null => {
  if (!url || url.startsWith("File selected:")) return null;

  // Handle full URLs (https://gateway.com/ipfs/cid or https://gateway.com/ipfs/cid/path)
  try {
    const urlObj = new URL(url);
    const pathParts = urlObj.pathname.split("/");
    const ipfsIndex = pathParts.findIndex((part) => part === "ipfs");
    if (ipfsIndex !== -1 && pathParts[ipfsIndex + 1]) {
      // Extract CID (may have additional path segments, so take first part after /ipfs/)
      const cid = pathParts[ipfsIndex + 1];
      // Validate CID format (base58 or base32)
      if (/^[a-zA-Z0-9]{46,}$/.test(cid)) {
        return cid;
      }
    }
  } catch {
    // Not a valid URL, continue with string parsing
  }

  // Handle string paths
  const parts = url.trim().split("/");

  // Look for 'ipfs' in the URL segments
  const ipfsIndex = parts.findIndex((part) => part === "ipfs");

  let cid: string | undefined;

  // Case 1: /ipfs/<cid>
  if (ipfsIndex !== -1 && parts[ipfsIndex + 1]) {
    cid = parts[ipfsIndex + 1];
    // Validate CID format
    if (/^[a-zA-Z0-9]{46,}$/.test(cid)) {
      return cid;
    }
  }
  // Case 2: ipfs://<cid>...
  else if (url.startsWith("ipfs://")) {
    cid = url.replace("ipfs://", "").split("/")[0];
    if (/^[a-zA-Z0-9]{46,}$/.test(cid)) {
      return cid;
    }
  }
  // Case 3: Raw CID
  else if (/^[a-zA-Z0-9]{46,}$/.test(url)) {
    return url;
  }

  return null;
};

export async function uploadToIPFS(file: File) {
  try {
    console.log("Uploading file to Pinata IPFS:", file.name);
    
    const upload = await pinata.upload.public.file(file);
    console.log("Upload result:", upload);
    
    // Return the proper IPFS URL using your gateway
    const ipfsUrl = `https://${process.env.NEXT_PUBLIC_PINATA_GATEWAY}/ipfs/${upload.cid}`;
    
    console.log("Generated IPFS URL:", ipfsUrl);
    return ipfsUrl;
    
  } catch (error) {
    console.error("Error uploading file to IPFS:", error);
    throw error;
  }
}
/**
 * Formats an IPFS URL for READING (uses public gateways)
 * For uploading, use uploadToIPFS which uses the custom gateway
 */
export const formatIpfsUrl = (url: string): string => {
  const cid = extractIpfsCid(url);
  if (!cid) return url;

  // For reading, always use public gateways (not the custom authenticated gateway)
  // Default to ipfs.io public gateway
  return `https://ipfs.io/ipfs/${cid}`;
};

export const ipfsImageLoader: ImageLoader = ({ src, width, quality }) => {
  if (!src) return "";

  // Always try to extract CID first, even from full URLs
  // This ensures we strip custom gateway URLs and use public gateways
  const cid = extractIpfsCid(src);
  
  if (cid) {
    // Always use public gateway for reading images
    // Strip any custom gateway URLs (including *.mypinata.cloud) and use public ipfs.io
    const publicUrl = `https://ipfs.io/ipfs/${cid}`;
    // Debug: log if we're converting from custom gateway
    if (src.includes('mypinata.cloud') || src.includes('pinata.cloud')) {
      console.log('[ipfsImageLoader] Converting custom gateway URL to public:', { original: src, converted: publicUrl });
    }
    return publicUrl;
  }

  // If src is already a full URL and not IPFS, return it as-is
  // (for non-IPFS images like regular HTTP images)
  if (src.startsWith("http")) {
    return src;
  }

  // Fallback: try to format as IPFS URL (for raw CIDs or ipfs:// URLs)
  return formatIpfsUrl(src);
};

/**
 * Fetches an IPFS file via the IPFS HTTP client and returns a blob URL
 * suitable for use in <img src={...} />.
 */
export const fetchIpfsImageObjectUrl = async (input: string): Promise<string> => {
  const cid = extractIpfsCid(input);
  if (!cid) {
    throw new Error(`Unable to extract CID from input: ${input}`);
  }

  const fs = await getUnixFs();
  const file = fs.cat(cid);
  const chunks: Uint8Array[] = [];

  for await (const chunk of file) {
    chunks.push(chunk);
  }

  const blob = new Blob(chunks as BlobPart[]);
  return URL.createObjectURL(blob);
};
