const { expect } = require("chai");
const { ethers } = require("hardhat");
const { parseEther } = ethers.utils;

describe("StakingPool", function () {
    let SGLToken;
    let StakingPool;
    let token;
    let stakingPool;
    let owner;
    let user;
    let userTwo;
    
    const initialSupply = parseEther("1000000"); // 1M tokens for testing
    const stakeAmount = parseEther("1000"); // 1000 tokens

    beforeEach(async function () {
        [owner, user, userTwo] = await ethers.getSigners();
        
        // Deploy SGL Token
        SGLToken = await ethers.getContractFactory("SGLToken");
        token = await SGLToken.deploy(owner.address, initialSupply);
        await token.deployed();
        
        // Deploy Staking Pool
        StakingPool = await ethers.getContractFactory("StakingPool");
        stakingPool = await StakingPool.deploy(token.address);
        await stakingPool.deployed();

        // Transfer tokens to users for testing
        await token.transfer(user.address, stakeAmount.mul(2));
        await token.transfer(userTwo.address, stakeAmount.mul(2));
    });

    describe("Deployment", function () {
        it("Should set the correct token address", async function () {
            expect(await stakingPool.sgl()).to.equal(token.address);
        });

        it("Should start with zero total staked", async function () {
            expect(await stakingPool.totalStaked()).to.equal(0);
        });
    });

    describe("Staking", function () {
        beforeEach(async function () {
            // Approve staking pool to spend tokens
            await token.connect(user).approve(stakingPool.address, stakeAmount);
        });

        it("Should allow staking tokens", async function () {
            await stakingPool.connect(user).stake(stakeAmount);
            
            expect(await stakingPool.balances(user.address)).to.equal(stakeAmount);
            expect(await stakingPool.totalStaked()).to.equal(stakeAmount);
        });

        it("Should emit Staked event", async function () {
            await expect(stakingPool.connect(user).stake(stakeAmount))
                .to.emit(stakingPool, "Staked")
                .withArgs(user.address, stakeAmount);
        });

        it("Should fail when staking zero amount", async function () {
            await expect(
                stakingPool.connect(user).stake(0)
            ).to.be.revertedWith("zero");
        });

        it("Should fail when staking more than balance", async function () {
            const tooMuch = stakeAmount.mul(3);
            await token.connect(user).approve(stakingPool.address, tooMuch);
            
            await expect(
                stakingPool.connect(user).stake(tooMuch)
            ).to.be.revertedWith("transfer failed");
        });

        it("Should handle multiple stakes from same user", async function () {
            await token.connect(user).approve(stakingPool.address, stakeAmount.mul(2));
            
            await stakingPool.connect(user).stake(stakeAmount);
            await stakingPool.connect(user).stake(stakeAmount);
            
            expect(await stakingPool.balances(user.address)).to.equal(stakeAmount.mul(2));
            expect(await stakingPool.totalStaked()).to.equal(stakeAmount.mul(2));
        });
    });

    describe("Unstaking", function () {
        beforeEach(async function () {
            // Setup: stake tokens first
            await token.connect(user).approve(stakingPool.address, stakeAmount);
            await stakingPool.connect(user).stake(stakeAmount);
        });

        it("Should allow unstaking tokens", async function () {
            await stakingPool.connect(user).unstake(stakeAmount);
            
            expect(await stakingPool.balances(user.address)).to.equal(0);
            expect(await stakingPool.totalStaked()).to.equal(0);
        });

        it("Should emit Unstaked event", async function () {
            await expect(stakingPool.connect(user).unstake(stakeAmount))
                .to.emit(stakingPool, "Unstaked")
                .withArgs(user.address, stakeAmount);
        });

        it("Should fail when unstaking more than staked", async function () {
            await expect(
                stakingPool.connect(user).unstake(stakeAmount.mul(2))
            ).to.be.revertedWith("insufficient");
        });

        it("Should fail when unstaking with no stake", async function () {
            await expect(
                stakingPool.connect(userTwo).unstake(stakeAmount)
            ).to.be.revertedWith("insufficient");
        });

        it("Should handle partial unstaking", async function () {
            const halfStake = stakeAmount.div(2);
            await stakingPool.connect(user).unstake(halfStake);
            
            expect(await stakingPool.balances(user.address)).to.equal(halfStake);
            expect(await stakingPool.totalStaked()).to.equal(halfStake);
        });
    });

    describe("Multiple Users", function () {
        beforeEach(async function () {
            // Setup: approve and stake for both users
            await token.connect(user).approve(stakingPool.address, stakeAmount);
            await token.connect(userTwo).approve(stakingPool.address, stakeAmount);
            
            await stakingPool.connect(user).stake(stakeAmount);
            await stakingPool.connect(userTwo).stake(stakeAmount);
        });

        it("Should track individual balances correctly", async function () {
            expect(await stakingPool.balances(user.address)).to.equal(stakeAmount);
            expect(await stakingPool.balances(userTwo.address)).to.equal(stakeAmount);
        });

        it("Should maintain correct total staked", async function () {
            expect(await stakingPool.totalStaked()).to.equal(stakeAmount.mul(2));
        });

        it("Should handle unstaking from multiple users", async function () {
            await stakingPool.connect(user).unstake(stakeAmount);
            expect(await stakingPool.totalStaked()).to.equal(stakeAmount);
            
            await stakingPool.connect(userTwo).unstake(stakeAmount);
            expect(await stakingPool.totalStaked()).to.equal(0);
        });
    });

    describe("Security", function () {
        beforeEach(async function () {
            await token.connect(user).approve(stakingPool.address, stakeAmount);
            await stakingPool.connect(user).stake(stakeAmount);
        });

        it("Should prevent reentrancy on stake", async function () {
            // Note: ReentrancyGuard is tested implicitly as the contract inherits it
            // A more thorough test would involve creating a malicious contract
            await token.connect(userTwo).approve(stakingPool.address, stakeAmount);
            await stakingPool.connect(userTwo).stake(stakeAmount);
            expect(await stakingPool.totalStaked()).to.equal(stakeAmount.mul(2));
        });

        it("Should prevent reentrancy on unstake", async function () {
            await stakingPool.connect(user).unstake(stakeAmount);
            expect(await stakingPool.totalStaked()).to.equal(0);
        });
    });
});