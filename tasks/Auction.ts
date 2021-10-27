import { task } from 'hardhat/config'
const dotenv = require('dotenv')
const fs = require('fs')

task('start-auction', 'start auction')
	.addParam('itemid', 'The ID of the NFT Item')
	.addParam('minprice', 'The initial price for the NFT Item')
	.addParam('duration', 'The duration of the auction')
	.setAction(async ({ itemid, minprice, duration}, { ethers }) => {
		const envConfig = dotenv.parse(fs.readFileSync(".env"))
		for (const k in envConfig) {
			process.env[k] = envConfig[k]
		}
		const market = process.env.MARKET_ADDRESS as string;
		const contract = await ethers.getContractAt('Marketplace', market)
		await contract.startAuction(
			itemid,
			minprice,
			duration
		)
	})

task('make-bid', 'Make bid for the auction')
	.addParam('auctionid', 'The ID of the Auction')
	.addParam('bid', 'The placed bid')
	.setAction(async ({ auctionid, bid}, { ethers }) => {
		const envConfig = dotenv.parse(fs.readFileSync(".env"))
		for (const k in envConfig) {
			process.env[k] = envConfig[k]
		}
		const market = process.env.MARKET_ADDRESS as string;
		const contract = await ethers.getContractAt('Marketplace', market)
		await contract.makeBid(
			auctionid,
			bid
		)
	})

task('settle-nft', 'Transfer NFT after that auction')
	.addParam('auctionid', 'The ID of the Auction')
	.setAction(async ({ auctionid}, { ethers }) => {
		const envConfig = dotenv.parse(fs.readFileSync(".env"))
		for (const k in envConfig) {
			process.env[k] = envConfig[k]
		}
		const market = process.env.MARKET_ADDRESS as string;
		const contract = await ethers.getContractAt('Marketplace', market)
		await contract.settleNFT(auctionid);
	})