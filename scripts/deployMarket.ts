import { Market } from '../typechain'
import {ethers, run, network} from 'hardhat'
import {delay} from '../utils'
import { dotenv, fs } from "./imports";
const envConfig = dotenv.parse(fs.readFileSync(".env-"+network.name))
	for (const k in envConfig) {
		process.env[k] = envConfig[k]
	}   
const token = process.env.TOKEN_ADDRESS as string;
const nft = process.env.NFT_ADDRESS as string;
const chainId = process.env.CHAIN_ID as string;

async function deployMarket() {
    const Market = await ethers.getContractFactory('Market')
    console.log('starting deploying market...')
    const market = await Market.deploy(token, nft, chainId) as Market
    console.log('market deployed with address: ' + market.address)
    console.log('wait of deploying...')
    await market.deployed()
    console.log('wait of delay...')
    await delay(25000)
    console.log('starting verify market...')
    try {
        await run('verify:verify', {
            address: market!.address,
            contract: 'contracts/Market.sol:Market',
            constructorArguments: [ token, nft, chainId ],
        });
        console.log('verify success')
    } catch (e: any) {
        console.log(e.message)
        }
    }

deployMarket()
.then(() => process.exit(0))
.catch(error => {
	console.error(error)
	process.exit(1)
})