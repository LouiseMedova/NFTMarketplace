import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import { ethers, network } from 'hardhat'
import { expect, assert } from 'chai'
import BigNumber from 'bignumber.js'
BigNumber.config({ EXPONENTIAL_AT: 60 })

import Web3 from 'web3'
import {  BytesLike } from '@ethersproject/bytes';
// @ts-ignore
const web3 = new Web3(network.provider) as Web3

require('@openzeppelin/test-helpers/configure')({
	provider: network.provider,
  });
  
import { Token, NFT, Market, Bridge } from '../typechain'

let market1: Market
let market2: Market
let nft1: NFT
let nft2: NFT
let token1: Token
let token2: Token
let bridge1: Bridge
let bridge2: Bridge
let validator: SignerWithAddress
let artist: SignerWithAddress
let user1: SignerWithAddress
let user2: SignerWithAddress

const chainEth = 4;
const chainBsc = 97;

let nonce: number
let tokenId: number
let message: BytesLike
let signature: BytesLike

describe('Contract: Market', () => {
	beforeEach(async () => {
		[validator, artist, user1, user2] = await ethers.getSigners()

		let Token = await ethers.getContractFactory('Token')
		token1 = await Token.deploy('My Custom Token 1', 'MCT1') as Token
		token2 = await Token.deploy('My Custom Token 2', 'MCT2') as Token 

		let NFT = await ethers.getContractFactory('NFT')
		nft1 = await NFT.deploy('My First NFT 1', 'MFN 1','https://') as NFT
		nft2 = await NFT.deploy('My First NFT 2', 'MFN 2','https://') as NFT

		let Market = await ethers.getContractFactory('Market')
		market1 = await Market.deploy(token1.address, nft1.address, chainEth) as Market
		market2 = await Market.deploy(token2.address, nft2.address, chainBsc) as Market

		let Bridge = await ethers.getContractFactory('Bridge')
		bridge1 = await Bridge.deploy(nft1.address, market1.address, chainEth) as Bridge
		bridge2 = await Bridge.deploy(nft2.address, market2.address, chainBsc) as Bridge

		await bridge1.setChainId(chainBsc, true)
		await bridge2.setChainId(chainEth, true)

		// give roles to marketplace, nft and bridge contracts
		const artist_role = web3.utils.keccak256("ARTIST")
		const minter = web3.utils.keccak256("MINTER")
		const bridge_role = web3.utils.keccak256("BRIDGE")
		const validator_role = web3.utils.keccak256("VALIDATOR")
		await nft1.grantRole(minter, market1.address);
		await nft1.grantRole(artist_role, artist.address);
		await nft2.grantRole(minter, market2.address);
		await nft2.grantRole(artist_role, artist.address);
		await market1.grantRole(bridge_role, bridge1.address);
		await market2.grantRole(bridge_role, bridge2.address);
		await bridge1.grantRole(validator_role, validator.address)
		await bridge2.grantRole(validator_role, validator.address)
		// approve marketplace to transfer NFTs of users
		await nft1.connect(artist).setApprovalForAll(market1.address, true);
		await nft1.connect(user1).setApprovalForAll(market1.address, true);
		
		await market1.connect(artist).createNFT(
			"metadata-url.com/my-metadata_0",
			500
		)	
		
		await market2.connect(artist).createNFT(
			"metadata-url.com/my-metadata_10",
			500
		)

		await token1.transfer(user1.address, 1000);
		await token1.transfer(user2.address, 1000);
		await token1.connect(user1).approve(market1.address, 1000);
		await token1.connect(user2).approve(market1.address, 1000);

		nonce = 1;
		tokenId = 0;
		message = web3.utils.keccak256(web3.eth.abi.encodeParameters(
		['uint256','uint256','address','address','uint256','uint256','uint256'],
		[chainEth, chainBsc, artist.address, artist.address, tokenId, chainEth, nonce]))				
		signature = await web3.eth.sign(message, validator.address);
	})

	describe('Bridge', () => {
		it('Swap: it should lock the item on the market and create a copy NFT on another market', async () => {
			await expect(bridge1.connect(artist).initSwap(
					chainEth, 
					chainBsc, 
					artist.address,
					0,
					nonce,
					signature
					))
					.to.emit(bridge1, 'InitSwap')
					.withArgs(
						chainEth,
						chainBsc,
						artist.address,
						artist.address,
						0,
						'https://metadata-url.com/my-metadata_0',
						500,
						chainEth,
						nonce,
						signature
					);
			let item = await market1.tokenIdToItems(0);
			// Item must be in locked state on market1
			expect(item.state).to.equal(2);
			
			await bridge2.connect(artist).redeem(
				chainEth,
				chainBsc,
				artist.address,
				artist.address,
				0,
				'https://metadata-url.com/my-metadata_0',
				500,
				chainEth,
				nonce,
				signature
			)
		
			// The item copy on market2
			const id = await market2.correspondingIds(0);
			item =  await market2.tokenIdToItems(id);
			expect(item.tokenId).to.equal(0);
			expect(item.owner).to.equal(artist.address);
			expect(item.state).to.equal(0);
			expect(item.price).to.equal(0);
			expect(item.createdOnChain).to.equal(chainEth);
			expect(id).to.equal(1);	
		})

		it('should return NFT from other chain', async() => {
			await market2.connect(artist).createNFT(
				"metadata-url.com/my-metadata_11",
				500
			)
			await market2.connect(artist).createNFT(
				"metadata-url.com/my-metadata_12",
				500
			)
			//Transfer NFT
			await bridge1.connect(artist).initSwap(
				chainEth, 
				chainBsc, 
				artist.address,
				0,
				nonce,
				signature
				)
			await bridge2.connect(artist).redeem(
				chainEth,
				chainBsc,
				artist.address,
				artist.address,
				0,
				'https://metadata-url.com/my-metadata_0',
				500,
				chainEth,
				nonce,
				signature
				)
			// The item copy on market2
			const id = await market2.correspondingIds(0);
			// Returns NFT to the Ethereum network
			const message = web3.utils.keccak256(web3.eth.abi.encodeParameters(
				['uint256','uint256','address','address','uint256','uint256','uint256'],
				[chainBsc, chainEth, artist.address, artist.address, 0, chainEth, nonce]))				
			const signature2 = await web3.eth.sign(message, validator.address);

			await bridge2.connect(artist).initSwap(
				chainBsc,
				chainEth,
				artist.address,
				id,
				nonce,
				signature2
			)

			await bridge1.connect(artist).redeem(
				chainBsc,
				chainEth,
				artist.address,
				artist.address,
				0,
				'https://metadata-url.com/my-metadata_0',
				500,
				chainEth,
				nonce,
				signature2
			)
			const item = await market1.tokenIdToItems(0);
			expect(item.state).to.equal(0);	
		})
	})
})
