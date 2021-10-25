import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import { ethers, network, upgrades } from 'hardhat'
import { expect, assert } from 'chai'

import BigNumber from 'bignumber.js'
BigNumber.config({ EXPONENTIAL_AT: 60 })

import Web3 from 'web3'
// @ts-ignore
const web3 = new Web3(network.provider) as Web3

import { Token, NFT, Marketplace } from '../typechain'

let market: Marketplace
let nft: NFT
let token: Token
let admin: SignerWithAddress
let artist: SignerWithAddress
let user1: SignerWithAddress
let user2: SignerWithAddress



describe('Contract: Market', () => {
	beforeEach(async () => {
		[admin, artist, user1, user2] = await ethers.getSigners()

		let Token = await ethers.getContractFactory('Token')
		token = await Token.deploy('My Custom Token', 'MCT') as Token

		let NFT = await ethers.getContractFactory('NFT')
		nft = await NFT.deploy('My First NFT', 'MFN','https://') as NFT

		let Marketplace = await ethers.getContractFactory('Marketplace')
		market = await Marketplace.deploy(token.address) as Marketplace
		// give roles to marketplace and nft contracts
		const artist_role = web3.utils.keccak256("ARTIST")
		const minter = web3.utils.keccak256("MINTER")
		await nft.grantRole(minter, market.address);
		await market.grantRole(artist_role, artist.address);
		// approve marketplace to transfer NFTs of users
		await nft.connect(artist).setApprovalForAll(market.address, true);
		await nft.connect(user1).setApprovalForAll(market.address, true);
		
		await market.connect(artist).createNFT(
			nft.address,
			"metadata-url.com/my-metadata_1",
			100,
			10
		)			
	})

	describe('create NFT', () => {
		it('should create NFT', async () => {
			await expect(market.connect(artist).createNFT(
				nft.address,
				"metadata-url.com/my-metadata_2",
				100,
				10
			))
			.to.emit(market, 'ItemCreated')
			.withArgs(
				1,
				nft.address,
				artist.address,
				100,
				10
			)
		})
		it('should revert if price <= 0', async () => {
			await expect(
				market.connect(artist).createNFT(
					nft.address,
					"metadata-url.com/my-metadata_2",
					0,
					10))
					.to
					.be.revertedWith('_price must be > 0')
		})	
	})

	describe('Primary sale', () => {
		it('should set primary sale', async () => {
			const item = await market.items(0);
			await expect(market.connect(artist).startPrimarySale(0))
			.to.emit(market, 'PrimarySaleStarted')
			.withArgs(
				item.tokenId,
				item.nftAddress,
				item.creator,
				item.price,
				item.fee
			)
			const itemAfter =  await market.items(0);
			expect(itemAfter.state).to.equal(1)
		})
		it('should revert if item does not exist', async () => {
			await expect(
				market.connect(artist).startPrimarySale(1))
					.to
					.be.revertedWith('That item does not exist')
		})	
		it('should revert if a caller is not the creator of that item', async () => {
			await market.grantRole(web3.utils.keccak256("ARTIST"), user1.address);
			await expect(
				market.connect(user1).startPrimarySale(0))
					.to
					.be.revertedWith('A caller must be the creator of that item')
		})	
		it('should revert if the primary sale was already done', async () => {
			token.transfer(user1.address, 100);
			token.connect(user1).approve(market.address, 100);
			await market.connect(artist).startPrimarySale(0);
			await market.connect(user1).buyNFT(0);
			await expect(
				market.connect(artist).startPrimarySale(0))
					.to
					.be.revertedWith('Primary sale was already done')
		})
	})
	describe('Sale', () => {
		it('should set primary sale', async () => {
			const item = await market.items(0);
			await expect(market.connect(artist).startPrimarySale(0))
			.to.emit(market, 'PrimarySaleStarted')
			.withArgs(
				item.tokenId,
				item.nftAddress,
				item.creator,
				item.price,
				item.fee
			)
		})
		it('should revert if item does not exist', async () => {
			await expect(
				market.connect(artist).startPrimarySale(1))
					.to
					.be.revertedWith('That item does not exist')
		})	
		it('should revert if a caller is not the creator of that item', async () => {
			await market.grantRole(web3.utils.keccak256("ARTIST"), user1.address);
			await expect(
				market.connect(user1).startPrimarySale(0))
					.to
					.be.revertedWith('A caller must be the creator of that item')
		})	
	})
	describe('Buy NFT', () => {
		it('should buy NFT in primary market', async () => {
			const item = await market.items(0);
			token.transfer(user1.address, 1000);
			token.connect(user1).approve(market.address, 100);
			const balanceBefore = await token.balanceOf(artist.address);
			await market.connect(artist).startPrimarySale(0);
			await expect(market.connect(user1).buyNFT(0))
				.to.emit(market, 'Sale')
				.withArgs(
					item.tokenId,
					item.nftAddress,
					item.owner,
					user1.address,
					false,
					item.price
				)
			const itemAfter = await market.items(0);
			const balanceAfter = await token.balanceOf(artist.address);
			expect(itemAfter.owner).to.equal(user1.address);
			expect(itemAfter.primarySale).to.equal(true);
			expect(balanceAfter.sub(balanceBefore)).to.equal(100)
		})
		it('should buy NFT in secondary market', async () => {
			token.transfer(user1.address, 100);
			token.connect(user1).approve(market.address, 100);
			await market.connect(artist).startPrimarySale(0);
			await market.connect(user1).buyNFT(0);
			await market.connect(user1).startSale(0,100);
			const item = await market.items(0);			
			token.transfer(user2.address, 1000);
			token.connect(user2).approve(market.address, 100);
			await expect(market.connect(user2).buyNFT(0))
				.to.emit(market, 'Sale')
				.withArgs(
					item.tokenId,
					item.nftAddress,
					user1.address,
					user2.address,
					true,
					item.price
				)
			const artistBalance = await token.balanceOf(artist.address);
			const sellerBalance = await token.balanceOf(user1.address);
			expect(artistBalance).to.equal(110);
			expect(sellerBalance).to.equal(90);			
		})	
		it('should revert if item does not exist', async () => {
			await expect(
				market.connect(user1).buyNFT(1))
					.to
					.be.revertedWith('That item does not exist')		
		})	
		it('should revert if item is frozened', async () => {
			await expect(
				market.connect(user1).buyNFT(0))
					.to
					.be.revertedWith('The item must not be frozened')
		})
		it('should revert if the caller balance is too low', async () => {
			await market.connect(artist).startPrimarySale(0);
			await expect(
				market.connect(user1).buyNFT(0))
					.to
					.be.revertedWith('the balance of a caller must be >= the price item')
			
		})
	})
})
