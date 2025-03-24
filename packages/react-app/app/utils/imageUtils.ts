import { PinataSDK } from "pinata";
import fs from "fs";

// Initialize Pinata SDK
const pinata = new PinataSDK({
  pinataJwt: process.env.NEXT_PUBLIC_PINATA_JWT!, // Set your API key in env
  pinataGateway: process.env.NEXT_PIBLIC_PINATA_GATEWAY!, // Set your gateway URL in env
});

export async function uploadToIPFS(filePath: File) {
  try {
    const upload = await pinata.upload.public.file(filePath);
    return `${process.env.PINATA_GATEWAY}/ipfs/${upload.cid}`;
  } catch (error) {
    console.error("Error uploading file to IPFS:", error);
    throw error;
  }
}
