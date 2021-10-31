import { task } from 'hardhat/config'
const dotenv = require('dotenv')
const fs = require('fs')

task('getBalanceNFT', 'Balance of user')
	.addParam('chain', 'The current chain')	
	.addParam('user', 'The address of the user')
	.setAction(async ({ user, chain }, { ethers }) => {
		const envConfig = dotenv.parse(fs.readFileSync(".env-"+chain))
			for (const k in envConfig) {
				process.env[k] = envConfig[k]
			}   
		const nft = process.env.NFT_ADDRESS as string;
		const contract = await ethers.getContractAt('NFT', nft)
        const balance = await contract.balanceOf(user);
		console.log(balance.toString());
	})

task('approveNFT', 'approve tokens')
	.addParam('chain', 'The current chain')	
    .addParam('tokenid', 'the token ID')
	.setAction(async ({  tokenid, chain }, { ethers }) => {
		const envConfig = dotenv.parse(fs.readFileSync(".env-"+chain))
			for (const k in envConfig) {
				process.env[k] = envConfig[k]
			}   
		const nft = process.env.NFT_ADDRESS as string;
		const market = process.env.MARKET_ADDRESS as string;
		const contract = await ethers.getContractAt('NFT', nft)
        await contract.approve(market, tokenid);
	})

task('ownerOf', 'owner of token')
	.addParam('chain', 'The current chain')	
    .addParam('tokenid', 'the token ID')
	.setAction(async ({  tokenid, chain }, { ethers }) => {
		const envConfig = dotenv.parse(fs.readFileSync(".env-"+chain))
			for (const k in envConfig) {
				process.env[k] = envConfig[k]
			}   
		const nft = process.env.NFT_ADDRESS as string;
		const contract = await ethers.getContractAt('NFT', nft)
        const owner = await contract.ownerOf(tokenid);
		console.log(owner);
		
	})

// task('getApproved', 'getApproved address of NFT')
//     .addParam('tokenid', 'the token ID')
// 	.setAction(async ({  tokenid }, { ethers }) => {
// 		const contract = await ethers.getContractAt('NFT', nft)
//         const owner = await contract.getApproved(tokenid);
// 		console.log(owner);
		
// 	})

    