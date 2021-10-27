import { task } from 'hardhat/config'
const dotenv = require('dotenv')
const fs = require('fs')

task('createNFT', 'Creates NFT')
	.addParam('uri', 'Metadata URI of NFT')
    .addParam('fee', 'Royalty payment to the creator')
	.setAction(async ({ uri , fee }, { ethers }) => {
		const envConfig = dotenv.parse(fs.readFileSync(".env"))
		for (const k in envConfig) {
			process.env[k] = envConfig[k]
		}
		const market = process.env.MARKET_ADDRESS as string;
		const contract = await ethers.getContractAt('Marketplace', market)
		await contract.createNFT(uri, fee);
	})

task('startSale', 'Starts sale')
	.addParam('itemid', 'The ID of the NFT Item')
    .addParam('price', 'The price of the NFT')
	.setAction(async ({ itemid , price }, { ethers }) => {
		const envConfig = dotenv.parse(fs.readFileSync(".env"))
		for (const k in envConfig) {
			process.env[k] = envConfig[k]
		}
		const market = process.env.MARKET_ADDRESS as string;
		const contract = await ethers.getContractAt('Marketplace', market)
		await contract.startSale(itemid, price);
	})

task('stopSale', 'Starts sale')
	.addParam('itemid', 'The ID of the NFT Item')
	.setAction(async ({ itemid , price }, { ethers }) => {
		const envConfig = dotenv.parse(fs.readFileSync(".env"))
		for (const k in envConfig) {
			process.env[k] = envConfig[k]
		}
		const market = process.env.MARKET_ADDRESS as string;
		const contract = await ethers.getContractAt('Marketplace', market)
		await contract.stopSale(itemid);
	})

task('buyNFT', 'Starts sale')
	.addParam('itemid', 'The ID of the NFT Item')
	.setAction(async ({ itemid , price }, { ethers }) => {
		const envConfig = dotenv.parse(fs.readFileSync(".env"))
		for (const k in envConfig) {
			process.env[k] = envConfig[k]
		}
		const market = process.env.MARKET_ADDRESS as string;
		const contract = await ethers.getContractAt('Marketplace', market)
		await contract.buyNFT(itemid);
	})