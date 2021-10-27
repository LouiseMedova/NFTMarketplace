import { task } from 'hardhat/config'
const dotenv = require('dotenv')
const fs = require('fs')


task('grantArtistRole', 'Gives role to the artist')
	.addParam('user', 'The address of the user')
    .addParam('role', 'keccak256 of the role')
	.setAction(async ({ user , role }, { ethers }) => {

		const envConfig = dotenv.parse(fs.readFileSync(".env"))
		for (const k in envConfig) {
			process.env[k] = envConfig[k]
		}
		const market = process.env.MARKET_ADDRESS as string;
		const contract = await ethers.getContractAt('Marketplace', market)
		await contract.grantRole(role, user);
	})

task('grantMinterRole', 'Gives minter role to the market')
    .addParam('role', 'keccak256 of the role')
	.setAction(async ({ role}, { ethers }) => {

		const envConfig = dotenv.parse(fs.readFileSync(".env"))
		for (const k in envConfig) {
			process.env[k] = envConfig[k]
		}
		const market = process.env.MARKET_ADDRESS as string;
        const nft = process.env.NFT_ADDRESS as string;
		const contract = await ethers.getContractAt('NFT', nft)
		await contract.grantRole(role, market);
	})
