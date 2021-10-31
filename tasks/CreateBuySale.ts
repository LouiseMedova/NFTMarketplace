import { task } from 'hardhat/config'
const dotenv = require('dotenv')
const fs = require('fs')

task('createNFT', 'Creates NFT')
	.addParam('chain', 'The current chain')	
	.addParam('uri', 'Metadata URI of NFT')
    .addParam('fee', 'Royalty payment to the creator')
	.setAction(async ({ uri , fee, chain }, { ethers }) => {
		const envConfig = dotenv.parse(fs.readFileSync(".env-"+chain))
			for (const k in envConfig) {
				process.env[k] = envConfig[k]
			}   
		const market = process.env.MARKET_ADDRESS as string;
		const contract = await ethers.getContractAt('Market', market)
		await contract.createNFT(uri, fee);
	})

task('startSale', 'Starts sale')
	.addParam('chain', 'The current chain')	
	.addParam('itemid', 'The ID of the NFT Item')
    .addParam('price', 'The price of the NFT')
	.setAction(async ({ itemid , price, chain }, { ethers }) => {
		const envConfig = dotenv.parse(fs.readFileSync(".env-"+chain))
			for (const k in envConfig) {
				process.env[k] = envConfig[k]
			}   
		const market = process.env.MARKET_ADDRESS as string;
		const contract = await ethers.getContractAt('Market', market)
		await contract.startSale(itemid, price);
	})

task('stopSale', 'Starts sale')
	.addParam('chain', 'The current chain')	
	.addParam('itemid', 'The ID of the NFT Item')
	.setAction(async ({ itemid, chain }, { ethers }) => {
		const envConfig = dotenv.parse(fs.readFileSync(".env-"+chain))
			for (const k in envConfig) {
				process.env[k] = envConfig[k]
			}   
		const market = process.env.MARKET_ADDRESS as string;
		const contract = await ethers.getContractAt('Market', market)
		await contract.stopSale(itemid);
	})

task('buyNFT', 'buy NFT')
	.addParam('chain', 'The current chain')	
	.addParam('itemid', 'The ID of the NFT Item')
	.setAction(async ({ itemid, chain }, { ethers }) => {
		const envConfig = dotenv.parse(fs.readFileSync(".env-"+chain))
			for (const k in envConfig) {
				process.env[k] = envConfig[k]
			}   
		const market = process.env.MARKET_ADDRESS as string;
		const contract = await ethers.getContractAt('Market', market)
		await contract.buyNFT(itemid);
	})