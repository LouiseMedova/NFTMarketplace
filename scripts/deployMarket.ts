import { Marketplace } from '../typechain'
import {ethers, run} from 'hardhat'
import {delay} from '../utils'
import { dotenv, fs } from "./imports";
const envConfig = dotenv.parse(fs.readFileSync(".env"))
	for (const k in envConfig) {
		process.env[k] = envConfig[k]
	}
const token = process.env.TOKEN_ADDRESS as string;
const nft = process.env.NFT_ADDRESS as string;

async function deployMarket() {
    const Marketplace = await ethers.getContractFactory('Marketplace')
    console.log('starting deploying market...')
    const market = await Marketplace.deploy(token, nft) as Marketplace
    console.log('market deployed with address: ' + market.address)
    console.log('wait of deploying...')
    await market.deployed()
    console.log('wait of delay...')
    await delay(25000)
    console.log('starting verify market...')
    try {
        await run('verify:verify', {
            address: market!.address,
            contract: 'contracts/Marketplace.sol:Marketplace',
            constructorArguments: [ token, nft ],
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