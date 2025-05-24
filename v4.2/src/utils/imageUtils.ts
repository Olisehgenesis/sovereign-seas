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

// Improved formatIpfsUrl function
export const formatIpfsUrl = (url: string, gateway?: string) => {
  if (!url || url.startsWith("File selected:")) return "";
  
  // If it's already a proper HTTP URL, return as-is
  if (url.startsWith("http")) return url;
  
  let cid: string | undefined;
  
  // Strip 'undefined/' prefix if present
  if (url.startsWith("undefined/")) {
    url = url.replace("undefined/", "");
  }
  
  // Handle different IPFS URL formats
  if (url.startsWith("ipfs://")) {
    cid = url.replace("ipfs://", "").split("/")[0];
  } else if (url.includes("ipfs/")) {
    cid = url.split("ipfs/")[1].split(/[/?]/)[0];
  } else if (/^[a-zA-Z0-9]{46,}$/.test(url)) {
    // Raw CID
    cid = url;
  }
  
  if (!cid) return url;
  
  // Use provided gateway or default to your Pinata gateway
  const defaultGateway = `https://${import.meta.env.VITE_PINATA_GATEWAY}`;
  const finalGateway = gateway || defaultGateway;
  
  return `${finalGateway}/ipfs/${cid}`;
};