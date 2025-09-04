const { ethers } = require('hardhat');

async function checkBalance() {
  const [deployer] = await ethers.getSigners();
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log('Address:', deployer.address);
  console.log('Balance in wei:', balance.toString());
  console.log('Balance in CELO:', ethers.formatEther(balance));
  
  // Check network info
  const network = await ethers.provider.getNetwork();
  console.log('Network:', network.name, 'Chain ID:', network.chainId);
}

checkBalance().catch(console.error);
