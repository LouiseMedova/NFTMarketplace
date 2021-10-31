import { task } from 'hardhat/config'
const dotenv = require('dotenv')
const fs = require('fs')

task('getBalance', 'Balance of user')
	.addParam('chain', 'The current chain')
	.addParam('user', 'The address of the user')
	.setAction(async ({ user, chain }, { ethers }) => {	
		const envConfig = dotenv.parse(fs.readFileSync(".env-"+chain))
			for (const k in envConfig) {
				process.env[k] = envConfig[k]
			}   
		const token = process.env.TOKEN_ADDRESS as string;
		const contract = await ethers.getContractAt('Token', token)
        const balance = await contract.balanceOf(user);
	//		const balance = await contract.totalSupply();
		console.log(balance.toString());
	})

task('transfer', 'transfer tokens')
	.addParam('chain', 'The current chain')
	.addParam('user', 'The address of the user')
    .addParam('amount', 'the amount of tokens')
	.setAction(async ({ user, amount, chain }, { ethers }) => {
		const envConfig = dotenv.parse(fs.readFileSync(".env-"+chain))
			for (const k in envConfig) {
				process.env[k] = envConfig[k]
			}   
		const token = process.env.TOKEN_ADDRESS as string;
		const contract = await ethers.getContractAt('Token', token)
        await contract.transfer(user, amount);
	})

task('approve', 'approve tokens')
	.addParam('chain', 'The current chain')	
    .addParam('amount', 'the amount of tokens')
	.setAction(async ({  amount, chain }, { ethers }) => {
		const envConfig = dotenv.parse(fs.readFileSync(".env-"+chain))
			for (const k in envConfig) {
				process.env[k] = envConfig[k]
			}   
		const token = process.env.TOKEN_ADDRESS as string;
		const market = process.env.MARKET_ADDRESS as string;
		const contract = await ethers.getContractAt('Token', token)
        await contract.approve(market, amount);
	})

    