import { NFT } from '../typechain'
import {ethers, run} from 'hardhat'
import {delay} from '../utils'
import { dotenv, fs } from "./imports";

async function deployNFT() {
    const envConfig = dotenv.parse(fs.readFileSync(".env"))
	for (const k in envConfig) {
		process.env[k] = envConfig[k]
	}
	const token = process.env.TOKEN_ADDRESS as string;
	const NFT = await ethers.getContractFactory('NFT')
	console.log('starting deploying token...')
	const nft = await NFT.deploy('My First NFT', 'MFN','https://', token) as NFT
	console.log('NFT deployed with address: ' + nft.address)
	console.log('wait of deploying...')
	await nft.deployed()
	console.log('wait of delay...')
	await delay(25000)
	console.log('starting verify NFT...')
	try {
		await run('verify:verify', {
			address: nft!.address,
			contract: 'contracts/NFT.sol:NFT',
			constructorArguments: [ 'My First NFT', 'MFN','https://',token ],
		});
		console.log('verify success')
	} catch (e: any) {
		console.log(e.message)
	}
}

deployNFT()
.then(() => process.exit(0))
.catch(error => {
	console.error(error)
	process.exit(1)
})