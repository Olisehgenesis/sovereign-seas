import { PinataSDK } from "pinata";
import fs from "fs";

// Initialize Pinata SDK
const pinata = new PinataSDK({
  pinataJwt: process.env.NEXT_PUBLIC_PINATA_JWT!, // Set your API key in env
  pinataGateway: process.env.NEXT_PUBLIC_PINATA_GATEWAY!, // Fixed typo here
});

export async function uploadToIPFS(filePath: File) {
  try {
    const upload = await pinata.upload.public.file(filePath);
    return `${process.env.NEXT_PUBLIC_PINATA_GATEWAY}/ipfs/${upload.cid}`;
  } catch (error) {
    console.error("Error uploading file to IPFS:", error);
    throw error;
  }
}

// Fixed: make this function async to support await
export const formatIpfsUrl = async (url: string, gateway = "https://ipfs.io/ipfs") => {
  if (!url || url.startsWith("File selected:")) return "";

  let cid: string | undefined;

  // Strip 'undefined/' prefix if present
  if (url.startsWith("undefined/")) {
    url = url.replace("undefined/", "");
  }

  // Handle ipfs://CID or ipfs/CID
  if (url.startsWith("ipfs://")) {
    cid = url.replace("ipfs://", "").split("/")[0];
  } else if (url.includes("ipfs/")) {
    cid = url.split("ipfs/")[1].split(/[/?]/)[0];
  } else if (/^[a-zA-Z0-9]{46,}$/.test(url)) {
    // Possibly a raw CID
    cid = url;
  }

  if (!cid) return url; // return as-is if not recognized as IPFS

  const convertedUrl = await pinata.gateways.public.convert(cid);
  return convertedUrl;
};
