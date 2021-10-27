import { task } from 'hardhat/config'
const dotenv = require('dotenv')
const fs = require('fs')
const envConfig = dotenv.parse(fs.readFileSync(".env"))
		for (const k in envConfig) {
			process.env[k] = envConfig[k]
		}
const token = process.env.TOKEN_ADDRESS as string;
const market = process.env.MARKET_ADDRESS as string;

task('getBalance', 'Balance of user')
	.addParam('user', 'The address of the user')
	.setAction(async ({ user }, { ethers }) => {
		const contract = await ethers.getContractAt('Token', token)
        const balance = await contract.balanceOf(user);
		console.log(balance.toString());
	})

task('transfer', 'transfer tokens')
	.addParam('user', 'The address of the user')
    .addParam('amount', 'the amount of tokens')
	.setAction(async ({ user, amount }, { ethers }) => {
		const contract = await ethers.getContractAt('Token', token)
        const balance = await contract.transfer(user, amount);
	})

task('approve', 'approve tokens')
    .addParam('amount', 'the amount of tokens')
	.setAction(async ({  amount }, { ethers }) => {
		const contract = await ethers.getContractAt('Token', token)
        const balance = await contract.approve(market, amount);
	})

    