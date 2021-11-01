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
		await nft2.connect(artist).setApprovalForAll(market2.address, true);
		await nft1.connect(user1).setApprovalForAll(market1.address, true);
		await nft2.connect(user1).setApprovalForAll(market2.address, true);
		
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
		await token2.transfer(user1.address, 1000);
		await token2.transfer(user2.address, 1000);
		await token2.connect(user1).approve(market2.address, 1000);
		await token2.connect(user2).approve(market2.address, 1000);

		nonce = 1;
		tokenId = 0;
		message = web3.utils.keccak256(web3.eth.abi.encodeParameters(
		['uint256','uint256','address','address','uint256','uint256','uint256'],
		[chainEth, chainBsc, artist.address, artist.address, tokenId, chainEth, nonce]))				
		signature = await web3.eth.sign(message, validator.address);	
	})

	describe('Bridge', () => {
		describe('Swap', () => {
			it('should create swap with SWAP status and emit event', async () => {				
				await expect(bridge1.connect(artist).initSwap(
					chainEth, 
					chainBsc,
					artist.address,
					0, 
					nonce, 
					signature))
					.to.emit(bridge1, 'InitSwap')
					.withArgs(
						chainEth,
						chainBsc,
						artist.address,
						artist.address,
						0,
						chainEth,
						nonce,
						signature);
				
				const swap = await bridge1.swaps(message);
				expect(swap.status).to.equal(1);
			})
		
			it('should revert if the swap is not empty', async() => {		
				await bridge1.connect(artist).initSwap(
					chainEth, 
					chainBsc,
					artist.address,
					0, 
					nonce, 
					signature);
				
				await expect(
					bridge1.connect(artist).initSwap(
						chainEth, 
						chainBsc,
						artist.address,
						0, 
						nonce, 
						signature))
					.to
					.be
					.revertedWith('swap status must be EMPTY')		
			})

			it('should revert if chain ID is wrong', async() => {
				await expect(
					bridge1.initSwap(
						0, 
						chainBsc,
						artist.address,
						0, 
						nonce, 
						signature))
					.to
					.be
					.revertedWith('wrong chainId')
			})

			it('should revert if chain ID is not allowed', async() => {
				await expect(
					bridge1.initSwap(
						chainEth, 
						0,
						artist.address,
						0, 
						nonce, 
						signature))
					.to
					.be
					.revertedWith('_chainTo is not allowed')
			})

			it('should revert if swap is called not by the NFT owner', async() => {
				await expect(bridge1.connect(user1).initSwap(
					chainEth, 
					chainBsc, 
					user1.address,
					0,
					nonce,
					signature
					))
					.to.be.revertedWith('only NFT owner can transfer to another chain')
			})
		})

		describe('Redeem', () => {
			it('should create swap with REDEEM status and emit event', async () => {		
				await expect(bridge2.connect(artist).redeem(
					chainEth,
					chainBsc, 
					artist.address,
					artist.address,
					0,
					chainEth,
					nonce, 
					signature))
					.to.emit(bridge2, 'Redeem')
					.withArgs(
						chainEth, 
						chainBsc,
						artist.address,
						0,
						nonce);
				
				const swap = await bridge2.swaps(message);
				expect(swap.status).to.equal(2);
			 })
	
			it('should revert if the swap is not empty', async () => {
				await bridge2.connect(artist).redeem(
					chainEth,
					chainBsc, 
					artist.address,
					artist.address,
					0,
					chainEth,
					nonce, 
					signature)
				await expect(
					bridge2.connect(artist).redeem(
						chainEth,
						chainBsc, 
						artist.address,
						artist.address,
						0,
						chainEth,
						nonce, 
						signature))
					.to
					.be
					.revertedWith('swap status must be EMPTY')			
			})
	
			it('should revert if validator is wrong', async () => {
				message = web3.utils.keccak256(web3.eth.abi.encodeParameters(
					['uint256','uint256','address','address','uint256','uint256'],
					[chainEth, chainBsc, artist.address, artist.address, 0, nonce]))
				const signature = await web3.eth.sign(message, artist.address);			
				await expect(
					bridge2.connect(artist).redeem(
						chainEth,
						chainBsc, 
						artist.address,
						artist.address,
						0,
						chainEth,
						nonce, 
						signature))
					.to
					.be
					.revertedWith('wrong validator')			
			})
			it('should revert if chain ID is wrong', async() => {
				await expect(
					bridge2.connect(artist).redeem(
						chainEth, 
						0,
						artist.address,
						artist.address,
						0, 
						chainEth,
						nonce, 
						signature))
					.to
					.be
					.revertedWith('wrong chainId')
			})
			it('should revert if chain ID is not allowed', async() => {
				await expect(
					bridge2.connect(artist).redeem(
						0, 
						chainBsc,
						artist.address,
						artist.address,
						0, 
						chainEth,
						nonce, 
						signature))
					.to
					.be
					.revertedWith('_chainTo is not allowed')
			})
		})

		describe('Bridge between markets', () => {
			describe('NFT copy on another market', async () => {
				beforeEach(async () => {
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
						chainEth,
						nonce,
						signature
					)
				})

				it('should lock the item on the market and make the market the NFT owner', async() => {
					const item = await market1.tokenIdToItems(0);			
					expect(item.state).to.equal(2);
					expect(item.owner).to.equal(market1.address)
				})

				it('should create a NFT copy', async() => {
					const id = await market2.correspondingIds(0);
					const item =  await market2.tokenIdToItems(id);
					expect(item.tokenId).to.equal(0);
					expect(item.owner).to.equal(artist.address);
					expect(item.state).to.equal(0);
					expect(item.price).to.equal(0);
					expect(item.createdOnChain).to.equal(chainEth);
					expect(id).to.equal(1);	
				})

				it('should not create new NFT copy if that NFT was already on that chain', async() => {
					// Returns NFT to the Ethereum network
					let message = web3.utils.keccak256(web3.eth.abi.encodeParameters(
						['uint256','uint256','address','address','uint256','uint256','uint256'],
						[chainBsc, chainEth, artist.address, artist.address, 0, chainEth, nonce]))				
					const signature2 = await web3.eth.sign(message, validator.address);
		
					//Transfer NFT back
					await bridge2.connect(artist).initSwap(
						chainBsc, 
						chainEth, 
						artist.address,
						0,
						nonce,
						signature2
						)
					await bridge1.connect(artist).redeem(
						chainBsc,
						chainEth,
						artist.address,
						artist.address,
						0,
						chainEth,
						nonce,
						signature2
						)
					const totalSupply = await nft2.totalSupply()
					// Transfer again 
					const newNonce = 2;
					message = web3.utils.keccak256(web3.eth.abi.encodeParameters(
						['uint256','uint256','address','address','uint256','uint256','uint256'],
						[chainEth, chainBsc, artist.address, artist.address, 0, chainEth, newNonce]))				
					const signature3 = await web3.eth.sign(message, validator.address);
					await bridge1.connect(artist).initSwap(
						chainEth, 
						chainBsc, 
						artist.address,
						0,
						newNonce,
						signature3
						)
					await bridge2.connect(artist).redeem(
						chainEth,
						chainBsc,
						artist.address,
						artist.address,
						0,
						chainEth,
						newNonce,
						signature3
						)
					expect(await nft2.totalSupply()).to.equal(totalSupply)
				})
			})

			describe('Sale on another market', async () => {
				beforeEach(async () => {
					await market1.connect(artist).startSale(0, 100);
					await market1.connect(user1).buyNFT(0)
					await bridge1.connect(user1).initSwap(
						chainEth, 
						chainBsc, 
						artist.address,
						0,
						nonce,
						signature
						)
			
					await bridge2.connect(user1).redeem(
						chainEth,
						chainBsc,
						artist.address,
						artist.address,
						0,
						chainEth,
						nonce,
						signature
					)
				})

				it('should set royalty to the artist', async() => {
					const id = await market2.correspondingIds(0);
					const item = await market2.getItem(id)
					const royalty = await nft2.getArtist(item.tokenId);	
					expect(royalty).to.equal(artist.address)
				})
				it('should sell nft on another chain and return it back', async() => {
					//start sale
					const id = await market2.correspondingIds(0);			
					await market2.connect(artist).startSale(id, 100);
					await market2.connect(user1).buyNFT(id)
					
					//user1 transfers NFT back
					const message = web3.utils.keccak256(web3.eth.abi.encodeParameters(
						['uint256','uint256','address','address','uint256','uint256','uint256'],
						[chainBsc, chainEth, user1.address, user1.address, 0, chainEth, nonce]))				
					const signature2 = await web3.eth.sign(message, validator.address);
					await bridge2.connect(user1).initSwap(
						chainBsc, 
						chainEth, 
						user1.address,
						id,
						nonce,
						signature2
						)
					await bridge1.connect(artist).redeem(
						chainBsc,
						chainEth,
						user1.address,
						user1.address,
						0,
						chainEth,
						nonce,
						signature2
					)
					const item1 = await market1.tokenIdToItems(0)
					expect(item1.owner).to.equal(user1.address)
					expect(item1.state).to.equal(0)			
				})
			})		
	
			it('NFT owner cannot do anything if the NFT is locked', async() => {
				await bridge1.connect(artist).initSwap(
					chainEth, 
					chainBsc, 
					artist.address,
					0,
					nonce,
					signature
					);
				await expect(
					market1.connect(artist).startSale(0, 100))
					.to.be.revertedWith('A caller must be the owner of that token')
	
				const item = await market1.tokenIdToItems(0);
				await expect(
					nft1.connect(artist).transferFrom(
						artist.address, 
						user1.address,
						item.tokenId)).
						to.be.revertedWith('ERC721: transfer caller is not owner nor approved')
			})
	
		})
	})
})
