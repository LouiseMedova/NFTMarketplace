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
  
const time = require('@openzeppelin/test-helpers')
import { Token, NFT, Market} from '../typechain'

let market: Market
let nft: NFT
let token: Token
let admin: SignerWithAddress
let artist: SignerWithAddress
let user1: SignerWithAddress
let user2: SignerWithAddress

const chainEth = 4;

describe('Contract: Market', () => {
	beforeEach(async () => {
		[admin, artist, user1, user2] = await ethers.getSigners()

		let Token = await ethers.getContractFactory('Token')
		token = await Token.deploy('My Custom Token 1', 'MCT1') as Token

		let NFT = await ethers.getContractFactory('NFT')
		nft = await NFT.deploy('My First NFT 1', 'MFN 1','https://') as NFT

		let Market = await ethers.getContractFactory('Market')
		market = await Market.deploy(token.address, nft.address, chainEth) as Market

		// give roles to marketplace, nft and bridge contracts
		const artist_role = web3.utils.keccak256("ARTIST")
		const minter = web3.utils.keccak256("MINTER")
		await nft.grantRole(minter, market.address);
		await nft.grantRole(artist_role, artist.address);
		// approve marketplace to transfer NFTs of users
		await nft.connect(artist).setApprovalForAll(market.address, true);
		await nft.connect(user1).setApprovalForAll(market.address, true);
		
		await market.connect(artist).createNFT(
			"metadata-url.com/my-metadata_0",
			500
		)	
		
		await token.transfer(user1.address, 1000);
		await token.transfer(user2.address, 1000);
		await token.connect(user1).approve(market.address, 1000);
		await token.connect(user2).approve(market.address, 1000);
	})

	describe('create NFT', () => {
		it('should create NFT', async () => {	
			await expect(market.connect(artist).createNFT(
				"metadata-url.com/my-metadata_1",
				10
			))
				.to.emit(market, 'ItemCreated')
				.withArgs(
					1,
					artist.address,
					0, 
					chainEth
				)
		})
	})

	describe('Auction', () => {
		it('should start the auction', async () => {
			await expect(market.connect(artist).startAuction(0, 100, 86400))
				.to.emit(market, 'AuctionStarted')
				.withArgs(
					0,
					artist.address,
					100
			)
		})

		it('should revert if initial price <= 0', async () => {
			await expect(
				market.connect(artist).startAuction(0, 0, 86400))
					.to
					.be.revertedWith('_minPrice  must be > 0')
		})

		it('should revert if auction duration less than one day', async () => {
			await expect(
				market.connect(artist).startAuction(0, 100, 86300))
					.to
					.be.revertedWith('_duration must be more than one day')
		})	

		it('should revert if a caller is not the token owner', async() => {
			await expect(
				market.connect(user1).startAuction(0, 100, 86400))
					.to
					.be.revertedWith('A caller must be the owner of that token')
		})

		it('should make bid', async () => {
			await market.connect(artist).startAuction(0, 100, 86400);
			await expect(market.connect(user1).makeBid(0, 101))
				.to.emit(market, 'Bid')
				.withArgs(
					0,
					101,
					user1.address
			)
			const auction = await market.auctions(0);
			expect(auction.currentBestBid).to.equal(101);
			expect(auction.currentRecipient).to.equal(user1.address)
		})

		it('should revert if user makes bid for the auction that does not exist', async () => {
			await expect(
				market.connect(user1).makeBid(0, 101))
					.to
					.be.revertedWith('that auction does not exist')
		})

		it('should revert if the offered bid is lower than the current one', async() => {
			await market.connect(artist).startAuction(0, 100, 86400);
			await market.connect(user1).makeBid(0, 200)
			await expect(
				market.connect(user1).makeBid(0, 101))
					.to
					.be.revertedWith('the offered bid must be higher the current one')
		})

		it('should revert if user makes bid for the auction that has expired', async () => {
			await market.connect(artist).startAuction(0, 100, 86400);
			await network.provider.send("evm_increaseTime", [86401])
			await expect(
				market.connect(user1).makeBid(0, 101))
					.to
					.be.revertedWith('that auction has ended')
		})

		it('should revert if user balance is not enough for that bid', async() => {
			await market.connect(artist).startAuction(0, 100, 86400);
			await expect(
				market.connect(user1).makeBid(0, 1001))
					.to
					.be.revertedWith('the balance of a caller must be enough for that bid')
		})

		it('should not settle NFT if auction is going on', async () => {
			await market.connect(artist).startAuction(0, 100, 86400);
			await market.connect(user1).makeBid(0, 101);
			await expect(
				market.connect(user1).settleNFT(0))
					.to
					.be.revertedWith('that auction must be have ended')
		})

		it('Full auction from the beginning to the end', async() => {
			//owner starts auction
			await market.connect(artist).startAuction(0, 100, 86400);
			// users make beds
			await market.connect(user1).makeBid(0, 200)
			await market.connect(user2).makeBid(0, 300)
			await market.connect(user1).makeBid(0, 400)
			await market.connect(user2).makeBid(0, 500)
			await market.connect(user1).makeBid(0, 1000)
			
			await network.provider.send("evm_increaseTime", [86401])
			
			await expect(market.connect(user1).settleNFT(0))
				.to.emit(market, 'AuctionEnded')
				.withArgs(
					0,
					1000,
					user1.address
				);
			const item = await market.tokenIdToItems(0);
			expect(item.owner).to.equal(user1.address);
			expect(item.price).to.equal(1000);
			expect(await nft.balanceOf(user1.address)).to.equal(1)
			expect(await token.balanceOf(user1.address)).to.equal(0)
			expect(await token.balanceOf(artist.address)).to.equal(1000)
		})
	})

	describe('Sale', () => {
		it('should start sale', async () => {
			const item = await market.tokenIdToItems(0);
			await expect(market.connect(artist).startSale(0, 500))
			.to.emit(market, 'SaleStarted')
			.withArgs(
				0,
				item.owner,
				500
			)
		})

		it('should revert if item does not exist', async () => {
			await expect(
				market.connect(artist).startSale(1, 500))
					.to
					.be.revertedWith('That item does not exist')
		})

		it('should stop sale', async() => {
			await market.connect(artist).stopSale(0)
			const item = await market.tokenIdToItems(0);
			expect(item.state).to.equal(0);
		})		
	})

	describe('Buy NFT', () => {
		it('should buy NFT', async () => {	
			token.connect(user2).approve(nft.address, 100);

			await market.connect(artist).startSale(0, 50);
			await market.connect(user1).buyNFT(0);
			await market.connect(user1).startSale(0,100);

			const item = await market.tokenIdToItems(0);			
			
			await expect(market.connect(user2).buyNFT(0))
				.to.emit(market, 'Sale')
				.withArgs(
					0,
					user1.address,
					user2.address,
					item.price
				)
			const artistBalance = await token.balanceOf(artist.address);
			const sellerBalance = await token.balanceOf(user1.address);
			expect(artistBalance).to.equal(55);
			expect(sellerBalance).to.equal(1045);			
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
	})
})
