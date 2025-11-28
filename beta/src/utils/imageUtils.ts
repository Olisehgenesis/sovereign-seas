import { PinataSDK } from "pinata";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore - helia http client types may not be installed yet
import { createHeliaHTTP } from "@helia/http";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore - helia unixfs types may not be installed yet
import { unixfs } from "@helia/unixfs";

// Initialize Pinata SDK
const pinata = new PinataSDK({
  pinataJwt: import.meta.env.VITE_PINATA_JWT,
  pinataGateway: import.meta.env.VITE_PINATA_GATEWAY, // Remove the ! here
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

  const parts = url.trim().split("/");

  // Look for 'ipfs' in the URL segments
  const ipfsIndex = parts.findIndex((part) => part === "ipfs");

  let cid: string | undefined;

  // Case 1: /ipfs/<cid>
  if (ipfsIndex !== -1 && parts[ipfsIndex + 1]) {
    cid = parts[ipfsIndex + 1];
  }
  // Case 2: ipfs://<cid>...
  else if (url.startsWith("ipfs://")) {
    cid = url.replace("ipfs://", "").split("/")[0];
  }
  // Case 3: Raw CID
  else if (/^[a-zA-Z0-9]{46,}$/.test(url)) {
    cid = url;
  }

  return cid || null;
};

export async function uploadToIPFS(file: File) {
  try {
    console.log("Uploading file to Pinata IPFS:", file.name);
    
    const upload = await pinata.upload.public.file(file);
    console.log("Upload result:", upload);
    
    // Return the proper IPFS URL using your gateway
    const ipfsUrl = `https://${import.meta.env.VITE_PINATA_GATEWAY}/ipfs/${upload.cid}`;
    
    console.log("Generated IPFS URL:", ipfsUrl);
    return ipfsUrl;
    
  } catch (error) {
    console.error("Error uploading file to IPFS:", error);
    throw error;
  }
}
export const formatIpfsUrl = (url: string): string => {
  const cid = extractIpfsCid(url);
  if (!cid) return url;

  // Use configurable gateway for WRITE-related URLs (env controls where uploads point)
  const gateway =
    import.meta.env.VITE_PINATA_GATEWAY || "ipfs.io";

  return `https://${gateway}/ipfs/${cid}`;
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
