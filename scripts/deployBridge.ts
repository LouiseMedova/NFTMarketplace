
import { Bridge } from '../typechain'
import {ethers, network, run} from 'hardhat'
import {delay} from '../utils'
import { dotenv, fs } from "./imports";

const envConfig = dotenv.parse(fs.readFileSync(".env-"+network.name))
	for (const k in envConfig) {
		process.env[k] = envConfig[k]
	}

const nft = process.env.NFT_ADDRESS as string;
const market = process.env.MARKET_ADDRESS as string;	
const chainId = process.env.CHAIN_ID as string;

async function deployBridge() {
	const Bridge = await ethers.getContractFactory('Bridge')
	console.log('starting deploying bridge...')
	const bridge = await Bridge.deploy(nft, market, chainId) as Bridge
	console.log('Bridge deployed with address: ' + bridge.address)
	console.log('wait of deploying...')
	await bridge.deployed()
	console.log('wait of delay...')
	await delay(25000)
	console.log('starting verify bridge...')
	try {
		await run('verify:verify', {
			address: bridge!.address,
			contract: 'contracts/Bridge.sol:Bridge',
			constructorArguments: [ nft, market, chainId ],
		});
		console.log('verify success')
	} catch (e: any) {
		console.log(e.message)
	}

}

deployBridge()
.then(() => process.exit(0))
.catch(error => {
	console.error(error)
	process.exit(1)
})