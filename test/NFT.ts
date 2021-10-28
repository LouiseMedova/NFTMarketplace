import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import { ethers, network } from 'hardhat'
import { expect } from 'chai'

import BigNumber from 'bignumber.js'
BigNumber.config({ EXPONENTIAL_AT: 60 })

import Web3 from 'web3'
// @ts-ignore
const web3 = new Web3(network.provider) as Web3

import { Token, NFT } from '../typechain'

let nft: NFT
let token: Token
let admin: SignerWithAddress
let user0: SignerWithAddress
let user1: SignerWithAddress
let user2: SignerWithAddress


describe('Contract: NFT', () => {
	beforeEach(async () => {
		[admin, user0, user1, user2] = await ethers.getSigners()
		let NFT = await ethers.getContractFactory('NFT')
		nft = await NFT.deploy('My First NFT', 'MFN','https://') as NFT
		const minter = web3.utils.keccak256("MINTER")
		const artist_role = web3.utils.keccak256("ARTIST")
		await nft.grantRole(artist_role, user0.address);
		await nft.grantRole(artist_role, user1.address);
		await nft.grantRole(minter, admin.address)
		await nft.createToken(user0.address, "metadata-url.com/my-metadata_1", 500)
		await nft.createToken(user0.address, "metadata-url.com/my-metadata_2", 500)
		await nft.createToken(user1.address, "metadata-url.com/my-metadata_3", 500)
	})

	describe('NFT', () => {
		it('shoudld deploy', async () => {
			const [
				name,
				symbol,
			] = await Promise.all([
				nft.name(),
				nft.symbol()
			])
			expect(name).to.equal('My First NFT')
			expect(symbol).to.equal('MFN')
		})

		it('should create tokens', async () => {
			const [
				ownerOf0,
				ownerOf1,
				ownerOf2,
				totalSupply,
				uri1,
				uri2,
				uri3
			] = await Promise.all([
				nft.ownerOf(0),
				nft.ownerOf(1),
				nft.ownerOf(2),
				nft.totalSupply(),
				nft.tokenURI(0),
				nft.tokenURI(1),
				nft.tokenURI(2)
			])
			expect(ownerOf0).to.equal(user0.address)
			expect(ownerOf1).to.equal(user0.address)
			expect(ownerOf2).to.equal(user1.address)
			expect(totalSupply).to.equal(3)
			expect(uri1).to.equal("https://metadata-url.com/my-metadata_1")
			expect(uri2).to.equal("https://metadata-url.com/my-metadata_2")
			expect(uri3).to.equal("https://metadata-url.com/my-metadata_3")
		})

		it('transfer tokens', async () => {
			await nft.connect(user0).transferFrom(user0.address, user1.address, 0);
			expect(await nft.balanceOf(user0.address)).to.equal(1);
			expect(await nft.balanceOf(user1.address)).to.equal(2);	
			expect(await nft.tokenOfOwnerByIndex(user1.address,0)).to.equal(2);	
			expect(await nft.tokenOfOwnerByIndex(user1.address,1)).to.equal(0);	
			expect(await nft.tokenOfOwnerByIndex(user0.address,0)).to.equal(1);	
		})

		it('should set royalties', async() => {
			const royalty = await nft.royalties(0);
			expect(royalty.artist).to.equal(user0.address);
			expect(royalty.fee).to.equal(500);	
		})
	})
})
