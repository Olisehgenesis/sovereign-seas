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