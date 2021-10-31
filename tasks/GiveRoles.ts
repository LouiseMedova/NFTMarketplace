import { task } from 'hardhat/config'
const dotenv = require('dotenv')
const fs = require('fs')

task('grantArtistRole', 'Gives role to the artist')
	.addParam('chain', 'The current chain')	
	.addParam('user', 'The address of the user')
    .addParam('role', 'keccak256 of the role')
	.setAction(async ({ user , role, chain }, { ethers }) => {
		const envConfig = dotenv.parse(fs.readFileSync(".env-"+chain))
			for (const k in envConfig) {
				process.env[k] = envConfig[k]
			}   
		const nft = process.env.NFT_ADDRESS as string;
		const contract = await ethers.getContractAt('NFT', nft)
		await contract.grantRole(role, user);
	})

task('grantMinterRole', 'Gives minter role to the market')
	.addParam('chain', 'The current chain')	
    .addParam('role', 'keccak256 of the role')
	.setAction(async ({ role, chain }, { ethers }) => {
		const envConfig = dotenv.parse(fs.readFileSync(".env-"+chain))
			for (const k in envConfig) {
				process.env[k] = envConfig[k]
			}   
		const nft = process.env.NFT_ADDRESS as string;
		const market = process.env.MARKET_ADDRESS as string;
		const contract = await ethers.getContractAt('NFT', nft)
		await contract.grantRole(role, market);
	})

task('grantBridgeRole', 'Gives BRIDGE role to the bridge')
	.addParam('chain', 'The current chain')	
    .addParam('role', 'keccak256 of the role')
	.setAction(async ({ role, chain }, { ethers }) => {
		const envConfig = dotenv.parse(fs.readFileSync(".env-"+chain))
			for (const k in envConfig) {
				process.env[k] = envConfig[k]
			}   
		const bridge = process.env.BRIDGE_ADDRESS as string;
		const market = process.env.MARKET_ADDRESS as string;
		const contract = await ethers.getContractAt('Market', market)
		await contract.grantRole(role, bridge);
	})

task('grantValidatorRole', 'Gives BRIDGE role to the bridge')
	.addParam('chain', 'The current chain')	
	.addParam('user', 'The validator address')
    .addParam('role', 'keccak256 of the role')
	.setAction(async ({ role, chain, user }, { ethers }) => {
		const envConfig = dotenv.parse(fs.readFileSync(".env-"+chain))
			for (const k in envConfig) {
				process.env[k] = envConfig[k]
			}   
		const bridge = process.env.BRIDGE_ADDRESS as string;
		const contract = await ethers.getContractAt('Bridge', bridge)
		await contract.grantRole(role, user);
	})