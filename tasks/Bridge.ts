import { task } from 'hardhat/config'
const dotenv = require('dotenv')
const fs = require('fs')


const chainIds: {[key:string]: number} = {
	ganache: 1337,
	goerli: 5,
	hardhat: 31337,
	kovan: 42,
	mainnet: 1,
	bsc_testnet: 97,
	rinkeby: 4,
	ropsten: 3
  }

task('swap', 'init swap')
	.addParam('chainfrom', 'Chain name from which tokens are transferred')
	.addParam('chainto', 'Chain name to which tokens are transferred')
	.addParam('recipient', 'The address of user receiving the tokens')
	.addParam('tokenid', 'The NFT ID')
	.addParam('nonce', 'The transaction identifier')
	.addParam('signature', 'The signature of validator')
	.setAction(async ({ chainfrom, chainto, recipient, tokenid, nonce, signature}, { ethers }) => {

		const envConfig = dotenv.parse(fs.readFileSync(".env-"+chainfrom))
		for (const k in envConfig) {
			process.env[k] = envConfig[k]
		}
		const bridge = process.env.BRIDGE_ADDRESS as string;
		const contract = await ethers.getContractAt('Bridge', bridge)
		await contract.initSwap(
			chainIds[chainfrom],
			chainIds[chainto],
			recipient,
			tokenid,
			nonce,
			signature
		)
	})

task('redeem', 'redeem tokens')
    .addParam('chainfrom', 'Chain name from which tokens are transferred')
    .addParam('chainto', 'Chain name to which tokens are transferred')
    .addParam('sender', 'The user address executing the swap')
    .addParam('recipient', 'The user address executing the swap')
    .addParam('tokenid', 'The NFT ID')
    .addParam('uri', 'NFT metadata')
    .addParam('fee', 'Royalty fee')
    .addParam('creatorchain', 'The chain the NFT was created on')
    .addParam('nonce', 'The transaction identifier')
    .addParam('signature', 'The signature of validator')
    .setAction(async ({ chainfrom, chainto, sender, recipient, tokenid, uri, fee, creatorchain, nonce, signature}, { ethers }) => {
        const envConfig = dotenv.parse(fs.readFileSync(".env-"+chainto))
        for (const k in envConfig) {
            process.env[k] = envConfig[k]
        }
        const bridge = process.env.BRIDGE_ADDRESS as string;
        const contract = await ethers.getContractAt('Bridge', bridge)	
        await contract.redeem(
            chainIds[chainfrom],
            chainIds[chainto],
            sender,
            recipient,
            tokenid,
            uri,
            fee,
            chainIds[creatorchain],
            nonce,
            signature
        )
    })

task('setChainId','Set Chain ID to which bridge can connect')
	.addParam('chain', 'Chain name')
	.addParam('chainallowed', 'Chain name to which tokens are transferred')
	.addParam('bool', 'allows or denies the connection to the Chain ID')
	.setAction(async ({ chain, chainallowed, bool }, {ethers}) => {
		const envConfig = dotenv.parse(fs.readFileSync(".env-"+chain))
		for (const k in envConfig) {
			process.env[k] = envConfig[k]
		}
		const bridge = process.env.BRIDGE_ADDRESS as string;
		const contract = await ethers.getContractAt('Bridge', bridge);
		await contract.setChainId(chainIds[chainallowed],bool);
	})