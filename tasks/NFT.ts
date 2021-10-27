import { task } from 'hardhat/config'
const dotenv = require('dotenv')
const fs = require('fs')
const envConfig = dotenv.parse(fs.readFileSync(".env"))
		for (const k in envConfig) {
			process.env[k] = envConfig[k]
		}
const nft = process.env.NFT_ADDRESS as string;
const market = process.env.MARKET_ADDRESS as string;

task('getBalanceNFT', 'Balance of user')
	.addParam('user', 'The address of the user')
	.setAction(async ({ user }, { ethers }) => {
		const contract = await ethers.getContractAt('NFT', nft)
        const balance = await contract.balanceOf(user);
		console.log(balance.toString());
	})

task('approveNFT', 'approve tokens')
    .addParam('tokenid', 'the token ID')
	.setAction(async ({  tokenid }, { ethers }) => {
		const contract = await ethers.getContractAt('NFT', nft)
        await contract.approve(market, tokenid);
	})

task('ownerOf', 'owner of token')
    .addParam('tokenid', 'the token ID')
	.setAction(async ({  tokenid }, { ethers }) => {
		const contract = await ethers.getContractAt('NFT', nft)
        const owner = await contract.ownerOf(tokenid);
		console.log(owner);
		
	})

task('getApproved', 'getApproved address of NFT')
    .addParam('tokenid', 'the token ID')
	.setAction(async ({  tokenid }, { ethers }) => {
		const contract = await ethers.getContractAt('NFT', nft)
        const owner = await contract.getApproved(tokenid);
		console.log(owner);
		
	})

    