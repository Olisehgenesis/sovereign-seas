import { PinataSDK } from "pinata";

// Initialize Pinata SDK
const pinata = new PinataSDK({
  pinataJwt: import.meta.env.VITE_PINATA_JWT,
  pinataGateway: import.meta.env.VITE_PINATA_GATEWAY, // Remove the ! here
});

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
/**
 * Dynamically normalizes any IPFS-related URL to use the public Pinata IPFS gateway.
 *
 * @param url - Any string potentially containing an IPFS CID (with or without a gateway)
 * @returns Formatted URL using https://gateway.pinata.cloud/ipfs/<cid>, or original if CID not found
 */
export const formatIpfsUrl = (url: string): string => {
  if (!url || url.startsWith("File selected:")) return "";

  const parts = url.trim().split("/");

  // Look for 'ipfs' in the URL segments
  const ipfsIndex = parts.findIndex(part => part === "ipfs");

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

  if (!cid) return url;

  return `https://gateway.pinata.cloud/ipfs/${cid}`;
};
