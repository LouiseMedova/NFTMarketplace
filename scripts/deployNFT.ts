import { NFT } from '../typechain'
import {ethers, run} from 'hardhat'
import {delay} from '../utils'

async function deployNFT() {
	const NFT = await ethers.getContractFactory('NFT')
	console.log('starting deploying NFT...')
	const nft = await NFT.deploy('My First NFT', 'MFN','https://') as NFT
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
			constructorArguments: [ 'My First NFT', 'MFN','https://'],
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